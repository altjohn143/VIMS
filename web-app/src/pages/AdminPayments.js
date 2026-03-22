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
  ListItemIcon
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
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [generateInvoiceDialogOpen, setGenerateInvoiceDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [processing, setProcessing] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  // Remove unused activeTab variable

  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    fetchPayments();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, paymentTypeFilter, searchTerm]); // Added proper dependency array

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: page + 1,
        limit: rowsPerPage
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentTypeFilter !== 'all') params.paymentType = paymentTypeFilter;
      
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
  };

  const fetchStats = async () => {
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
  };

  const handleConfirmPayment = async () => {
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
        toast.success('Payment confirmed successfully');
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
      'Due Date': p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
      'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
      'Payment Method': p.paymentMethod || '',
      'Receipt #': p.receiptNumber || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `payments_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success(`Exported ${exportData.length} records`);
  };

  const handleBack = () => navigate('/dashboard');
  const handleLogout = () => { logout(); navigate('/login'); };
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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={6} sm={3}>
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
            <Grid item xs={6} sm={3}>
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
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="outlined" startIcon={<FilterIcon />} onClick={fetchPayments}>
                Filter
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
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Resident</TableCell>
                  <TableCell>House</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} align="center"><CircularProgress /></TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center">No payments found</TableCell></TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
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
                          <Typography variant="caption" color="textSecondary">{payment.notes}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>{getStatusChip(payment.status, payment.dueDate)}</TableCell>
                      <TableCell>
                        {payment.paymentMethod ? payment.paymentMethod.toUpperCase() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {payment.status === 'pending' && payment.paymentMethod === 'cash' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setConfirmDialogOpen(true);
                            }}
                          >
                            Confirm
                          </Button>
                        )}
                        {payment.receiptNumber && (
                          <IconButton size="small" title="View Receipt">
                            <ReceiptIcon />
                          </IconButton>
                        )}
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

        {/* Confirm Payment Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirm Cash Payment</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Confirm that you have received cash payment for this invoice.
                </Alert>
                <Paper sx={{ p: 2, bgcolor: themeColors.background }}>
                  <Typography><strong>Invoice:</strong> {selectedPayment.invoiceNumber}</Typography>
                  <Typography><strong>Resident:</strong> {selectedPayment.residentId?.firstName} {selectedPayment.residentId?.lastName}</Typography>
                  <Typography><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleConfirmPayment} disabled={processing}>
              {processing ? <CircularProgress size={20} /> : 'Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Generate Invoices Dialog */}
        <Dialog open={generateInvoiceDialogOpen} onClose={() => setGenerateInvoiceDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Generate Monthly Invoices</DialogTitle>
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
            <Alert severity="warning" sx={{ mt: 2 }}>
              This will generate invoices for all active residents. Existing invoices for this month will be skipped.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateInvoiceDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleGenerateInvoices} disabled={processing}>
              {processing ? <CircularProgress size={20} /> : 'Generate'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Send Reminders Dialog */}
        <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Send Overdue Reminders</DialogTitle>
          <DialogContent>
            <Alert severity="info">
              This will send SMS/Email reminders to all residents with overdue payments.
            </Alert>
          </DialogContent>
          <DialogActions>
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