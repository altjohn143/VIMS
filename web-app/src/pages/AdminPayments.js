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
  TablePagination,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  InputAdornment,
  Avatar,
  Menu,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  VerifiedUser as VerifyIcon,
  QrCode as QrCodeIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const AdminPayments = () => {
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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [generateInvoiceDialogOpen, setGenerateInvoiceDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [qrphDialogOpen, setQrphDialogOpen] = useState(false);
  const [selectedQRPhPayment, setSelectedQRPhPayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [generateForm, setGenerateForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [processing, setProcessing] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  
  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePayment, setSelectedImagePayment] = useState(null);

  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Define fetchPayments with useCallback
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: page + 1,
        limit: rowsPerPage
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentTypeFilter !== 'all') params.paymentType = paymentTypeFilter;
      if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;
      
      const response = await axios.get('/api/payments', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setPayments(response.data.data);
        setTotal(response.data.pagination.total);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, paymentTypeFilter, paymentMethodFilter]);

  // Define fetchStats with useCallback
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/payments/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSummary(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Now useEffect with proper dependencies
  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments, fetchStats]);

  const handleConfirmCashPayment = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/payments/${selectedPayment._id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Cash payment confirmed successfully');
        fetchPayments();
        fetchStats();
        setConfirmDialogOpen(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyQRPhPayment = async () => {
    if (!selectedQRPhPayment) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `/api/payments/${selectedQRPhPayment._id}/confirm`,
        { 
          verificationNotes: verificationNotes,
          verifiedBy: user?.id,
          paymentMethod: 'qrph'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('QRPh payment verified and confirmed successfully!');
        fetchPayments();
        fetchStats();
        setQrphDialogOpen(false);
        setSelectedQRPhPayment(null);
        setVerificationNotes('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateInvoices = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/payments/generate-monthly',
        generateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        fetchPayments();
        setGenerateInvoiceDialogOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate invoices');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendReminders = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/payments/send-reminders',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setReminderDialogOpen(false);
        fetchPayments();
      }
    } catch (error) {
      toast.error('Failed to send reminders');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportExcel = () => {
    if (payments.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exportData = payments.map(p => ({
      'Invoice #': p.invoiceNumber,
      'Resident': `${p.residentId?.firstName} ${p.residentId?.lastName}`,
      'House': p.residentId?.houseNumber,
      'Description': p.description,
      'Amount': p.amount,
      'Status': p.status,
      'Payment Method': p.paymentMethod || '',
      'Reference #': p.referenceNumber || '',
      'Due Date': p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
      'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
      'Receipt #': p.receiptNumber || '',
      'Receipt Image': p.receiptImage || '',
      'Notes': p.notes || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `payments_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success(`Exported ${exportData.length} records`);
  };

  const handleViewReceiptImage = (payment) => {
    if (payment.receiptImage) {
      setSelectedImage(payment.receiptImage);
      setSelectedImagePayment(payment);
      setImageViewerOpen(true);
    } else {
      toast.error('No receipt image available for this payment');
    }
  };

  const handleBack = () => navigate('/dashboard');
  
  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };
  
  const handleProfileMenuOpen = (e) => setProfileAnchorEl(e.currentTarget);
  const handleProfileMenuClose = () => setProfileAnchorEl(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PH');
  };

  const getStatusChip = (status, dueDate) => {
    if (status === 'paid') {
      return <Chip icon={<CheckCircleIcon />} label="Paid" color="success" size="small" />;
    }
    if (dueDate && new Date() > new Date(dueDate)) {
      return <Chip icon={<WarningIcon />} label="Overdue" color="error" size="small" />;
    }
    return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
  };

  const getPaymentMethodChip = (method) => {
    if (!method) return <Chip label="N/A" size="small" variant="outlined" />;
    
    const methodConfig = {
      cash: { label: 'Cash', color: themeColors.success },
      qrph: { label: 'QRPh', color: themeColors.info },
      gcash: { label: 'GCash', color: themeColors.primary },
      paymaya: { label: 'PayMaya', color: themeColors.primary },
      bank_transfer: { label: 'Bank Transfer', color: themeColors.warning },
      check: { label: 'Check', color: themeColors.textSecondary }
    };
    
    const config = methodConfig[method] || { label: method.toUpperCase(), color: themeColors.textSecondary };
    
    return (
      <Chip 
        icon={method === 'qrph' ? <QrCodeIcon /> : null}
        label={config.label} 
        size="small" 
        sx={{ 
          bgcolor: `${config.color}20`,
          color: config.color,
          fontWeight: 500
        }} 
      />
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: themeColors.background }}>
      {/* Navigation Bar */}
      <AppBar position="static" sx={{ bgcolor: themeColors.primary }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <AdminIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Admin - Payment Management
          </Typography>
          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)' }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={handleProfileMenuClose}>
            <MenuItem component={Link} to="/profile" onClick={handleProfileMenuClose}>
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

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Total Collected</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.success }}>
                  {formatCurrency(summary.totalCollected)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Monthly Collection</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(summary.monthlyCollected)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Pending Balance</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.warning }}>
                  {formatCurrency(summary.pendingTotal)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Collection Rate</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.info }}>
                  {summary.collectionRate || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setGenerateInvoiceDialogOpen(true)}>
            Generate Monthly Invoices
          </Button>
          <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setReminderDialogOpen(true)}>
            Send Overdue Reminders
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
            Export to Excel
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPayments}>
            Refresh
          </Button>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                placeholder="Search by resident name, invoice #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Type</InputLabel>
                <Select value={paymentTypeFilter} onChange={(e) => setPaymentTypeFilter(e.target.value)} label="Payment Type">
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="monthly_dues">Monthly Dues</MenuItem>
                  <MenuItem value="special_assessment">Special Assessment</MenuItem>
                  <MenuItem value="service_fee">Service Fee</MenuItem>
                  <MenuItem value="penalty">Penalty</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} label="Payment Method">
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="qrph">QRPh</MenuItem>
                  <MenuItem value="gcash">GCash</MenuItem>
                  <MenuItem value="paymaya">PayMaya</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button fullWidth variant="outlined" startIcon={<FilterIcon />} onClick={fetchPayments}>
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Payments Table */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: themeColors.background }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Resident</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>House</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Payment Method</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reference #</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} align="center"><CircularProgress /></TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center">No payments found</TableCell></TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {payment.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {payment.residentId?.firstName} {payment.residentId?.lastName}
                      </TableCell>
                      <TableCell>{payment.residentId?.houseNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{payment.description}</Typography>
                        {payment.notes && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                            {payment.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>{getStatusChip(payment.status, payment.dueDate)}</TableCell>
                      <TableCell>{getPaymentMethodChip(payment.paymentMethod)}</TableCell>
                      <TableCell>
                        {payment.referenceNumber ? (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {payment.referenceNumber}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* Cash Payment Confirmation */}
                          {payment.status === 'pending' && payment.paymentMethod === 'cash' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setConfirmDialogOpen(true);
                              }}
                              sx={{ fontSize: '0.7rem', minWidth: '80px' }}
                            >
                              Confirm Cash
                            </Button>
                          )}
                          
                          {/* QRPh Payment Verification */}
                          {payment.status === 'pending' && payment.paymentMethod === 'qrph' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              onClick={() => {
                                setSelectedQRPhPayment(payment);
                                setQrphDialogOpen(true);
                              }}
                              startIcon={<VerifyIcon />}
                              sx={{ fontSize: '0.7rem', minWidth: '80px' }}
                            >
                              Verify QRPh
                            </Button>
                          )}
                          
                          {/* View Receipt Image Button */}
                          {payment.receiptImage && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewReceiptImage(payment)}
                              title="View Receipt Image"
                              sx={{
                                color: themeColors.info,
                                '&:hover': { backgroundColor: themeColors.info + '20' }
                              }}
                            >
                              <ImageIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          {/* View Receipt Info Button (for text notes) */}
                          {payment.notes && payment.notes.includes('QRPh payment submitted') && !payment.receiptImage && (
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                toast((t) => (
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="bold">Payment Notes:</Typography>
                                    <Typography variant="body2">{payment.notes}</Typography>
                                    {payment.referenceNumber && (
                                      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                                        Ref: {payment.referenceNumber}
                                      </Typography>
                                    )}
                                  </Box>
                                ), { duration: 5000 });
                              }}
                              title="View Receipt Info"
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          {/* View Receipt for paid payments */}
                          {payment.receiptNumber && (
                            <IconButton size="small" title="View Receipt">
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>

        {/* Confirm Cash Payment Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Confirm Cash Payment
          </DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box>
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Confirm that you have received cash payment for this invoice.
                </Alert>
                <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                  <Typography><strong>Invoice:</strong> {selectedPayment.invoiceNumber}</Typography>
                  <Typography><strong>Resident:</strong> {selectedPayment.residentId?.firstName} {selectedPayment.residentId?.lastName}</Typography>
                  <Typography><strong>House:</strong> {selectedPayment.residentId?.houseNumber || 'N/A'}</Typography>
                  <Typography><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleConfirmCashPayment} disabled={processing}>
              {processing ? <CircularProgress size={20} /> : 'Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* QRPh Payment Verification Dialog */}
        <Dialog open={qrphDialogOpen} onClose={() => setQrphDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ 
            fontWeight: 600, 
            color: themeColors.textPrimary,
            borderBottom: `1px solid ${themeColors.border}`,
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <QrCodeIcon sx={{ color: themeColors.info }} />
            Verify QRPh Payment
          </DialogTitle>
          <DialogContent>
            {selectedQRPhPayment && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  Please verify that the resident has completed the QRPh payment before confirming.
                </Alert>
                
                <Paper sx={{ p: 2, mb: 3, bgcolor: themeColors.background, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: themeColors.textPrimary }}>
                    Payment Details:
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Grid container spacing={1.5}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Invoice:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {selectedQRPhPayment.invoiceNumber}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Resident:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {selectedQRPhPayment.residentId?.firstName} {selectedQRPhPayment.residentId?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">House:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {selectedQRPhPayment.residentId?.houseNumber || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Amount:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: themeColors.success }}>
                        {formatCurrency(selectedQRPhPayment.amount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Reference #:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {selectedQRPhPayment.referenceNumber || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Submitted:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {formatDate(selectedQRPhPayment.createdAt)}
                      </Typography>
                    </Grid>
                    {selectedQRPhPayment.receiptImage && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="textSecondary">Receipt Image:</Typography>
                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ImageIcon />}
                            onClick={() => handleViewReceiptImage(selectedQRPhPayment)}
                            sx={{ borderRadius: 2 }}
                          >
                            View Receipt Image
                          </Button>
                        </Box>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="textSecondary">Resident's Notes:</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, p: 1, bgcolor: '#f1f5f9', borderRadius: 1 }}>
                        {selectedQRPhPayment.notes || 'No notes provided'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Verification Notes (Optional)"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add any notes about the verification (e.g., receipt checked, payment confirmed)..."
                  InputProps={{
                    sx: {
                      borderRadius: 2,
                      backgroundColor: '#f8fafc'
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      color: themeColors.textSecondary,
                      '&.Mui-focused': { color: themeColors.primary }
                    }
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => {
              setQrphDialogOpen(false);
              setSelectedQRPhPayment(null);
              setVerificationNotes('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="success" 
              onClick={handleVerifyQRPhPayment} 
              disabled={processing}
              startIcon={processing ? <CircularProgress size={20} /> : <VerifyIcon />}
              sx={{ bgcolor: themeColors.success, '&:hover': { bgcolor: '#0da271' } }}
            >
              {processing ? 'Verifying...' : 'Verify & Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Receipt Image Viewer Dialog */}
        <Dialog 
          open={imageViewerOpen} 
          onClose={() => setImageViewerOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: themeColors.cardBackground,
              maxWidth: '600px'
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 600, 
            color: themeColors.textPrimary,
            borderBottom: `1px solid ${themeColors.border}`,
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ImageIcon sx={{ color: themeColors.info }} />
              Payment Receipt
            </Box>
            <IconButton onClick={() => setImageViewerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedImage && (
              <Box>
                <Paper sx={{ p: 2, mb: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Payment Information:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Invoice:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2" fontWeight={500}>
                        {selectedImagePayment?.invoiceNumber}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Resident:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {selectedImagePayment?.residentId?.firstName} {selectedImagePayment?.residentId?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Amount:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2" fontWeight={700} color={themeColors.success}>
                        {formatCurrency(selectedImagePayment?.amount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">Reference #:</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2" fontFamily="monospace">
                        {selectedImagePayment?.referenceNumber}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Receipt Image:
                </Typography>
                <Paper sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: '#f8fafc',
                  textAlign: 'center'
                }}>
                  <img
                    src={`/api/payments/receipt-image/${selectedImage}`}
                    alt="Payment Receipt"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: `1px solid ${themeColors.border}`
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                      toast.error('Failed to load receipt image');
                    }}
                  />
                </Paper>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ZoomInIcon />}
                    onClick={() => window.open(`/api/payments/receipt-image/${selectedImage}`, '_blank')}
                    sx={{ borderRadius: 2 }}
                  >
                    Open Full Size
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/payments/receipt-image/${selectedImage}`;
                      link.download = selectedImage;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('Download started');
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    Download Image
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setImageViewerOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Generate Invoices Dialog */}
        <Dialog open={generateInvoiceDialogOpen} onClose={() => setGenerateInvoiceDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Generate Monthly Invoices
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select value={generateForm.month} onChange={(e) => setGenerateForm({ ...generateForm, month: e.target.value })}>
                    {[...Array(12)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={generateForm.year}
                  onChange={(e) => setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })}
                />
              </Grid>
            </Grid>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              This will generate invoices for all active residents. Existing invoices for this month will be skipped.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setGenerateInvoiceDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleGenerateInvoices} disabled={processing}>
              {processing ? <CircularProgress size={20} /> : 'Generate'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Send Reminders Dialog */}
        <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Send Overdue Reminders
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              This will send SMS/Email reminders to all residents with overdue payments.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setReminderDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="warning" onClick={handleSendReminders} disabled={processing}>
              {processing ? <CircularProgress size={20} /> : 'Send Reminders'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminPayments;