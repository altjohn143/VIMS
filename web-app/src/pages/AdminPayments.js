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
  Search as SearchIcon,
  FilterList as FilterIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  SmartToy as SmartToyIcon,
  VerifiedUser as VerifyIcon,
  QrCode as QrCodeIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminPayments = () => {
  const themeColors = {
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
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
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [qrphDialogOpen, setQrphDialogOpen] = useState(false);
  const [selectedQRPhPayment, setSelectedQRPhPayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState(500);
  const [duesAmountDialogOpen, setDuesAmountDialogOpen] = useState(false);
  const [duesAmountDraft, setDuesAmountDraft] = useState('');
  const [processing, setProcessing] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  
  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [selectedImagePayment, setSelectedImagePayment] = useState(null);

  const closeReceiptViewer = () => {
    setImageViewerOpen(false);
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImage(null);
    setSelectedImageUrl(null);
    setSelectedImagePayment(null);
  };

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

  const fetchMonthlyDuesAmount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/payments/admin/monthly-dues-amount', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMonthlyDuesAmount(response.data.data.amount);
        setDuesAmountDraft(String(response.data.data.amount));
      }
    } catch (error) {
      console.error('Error fetching monthly dues amount:', error);
    }
  }, []);

  // Now useEffect with proper dependencies
  useEffect(() => {
    fetchPayments();
    fetchStats();
    fetchMonthlyDuesAmount();
  }, [fetchPayments, fetchStats, fetchMonthlyDuesAmount]);

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

  const handleUpdateDuesAmount = async () => {
    const amount = parseFloat(duesAmountDraft);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid dues amount');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        '/api/payments/admin/monthly-dues-amount',
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Monthly dues amount updated');
        setMonthlyDuesAmount(response.data.data.amount);
        setDuesAmountDialogOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update dues amount');
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



  const handleExportPdf = () => {
    if (payments.length === 0) {
      toast.error('No data to export');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Payments Report', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['Invoice', 'Resident', 'House', 'Amount', 'Status', 'Method', 'Due Date']],
      body: payments.map((p) => ([
        p.invoiceNumber,
        `${p.residentId?.firstName || ''} ${p.residentId?.lastName || ''}`.trim(),
        p.residentId?.houseNumber || 'N/A',
        p.amount,
        p.status,
        p.paymentMethod || '',
        p.dueDate ? new Date(p.dueDate).toLocaleDateString() : ''
      ])),
      styles: { fontSize: 8 }
    });
    const exportTime = new Date();
    const timestamp = exportTime.toISOString().replace(/[:.]/g, '-').split('Z')[0];
    doc.save(`payments_export_${timestamp}.pdf`);
    toast.success('PDF exported');
  };

  const handleViewReceiptImage = async (payment) => {
    if (!payment?.receiptImage) {
      toast.error('No receipt image available for this payment');
      return;
    }

    setSelectedImage(payment.receiptImage);
    setSelectedImagePayment(payment);
    setSelectedImageUrl(null);
    setImageViewerOpen(true);

    try {
      const token = localStorage.getItem('token');
      const encodedFilename = encodeURIComponent(payment.receiptImage);
      const imageResponse = await axios.get(`/api/payments/receipt-image/${encodedFilename}`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const imageBlob = new Blob([imageResponse.data], { type: imageResponse.headers['content-type'] || 'image/jpeg' });
      const objectUrl = URL.createObjectURL(imageBlob);
      setSelectedImageUrl(objectUrl);
    } catch (error) {
      console.error('Failed to load receipt image:', error);
      toast.error('Failed to load receipt image');
      setSelectedImageUrl(null);
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

  const getReceiptAiChip = (receiptAi) => {
    if (!receiptAi) return <Chip label="Not analyzed" size="small" variant="outlined" />;
    const recommendation = receiptAi.recommendation || 'needs_review';
    if (recommendation === 'likely_legit') {
      return <Chip size="small" color="success" label="AI: Likely legit" />;
    }
    if (recommendation === 'likely_fraud') {
      return <Chip size="small" color="error" label="AI: Likely fraud" />;
    }
    return <Chip size="small" color="warning" label="AI: Needs review" />;
  };

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
          <AdminIcon sx={{ mr: 2, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Admin - Payment Management
          </Typography>
          <IconButton onClick={handleProfileMenuOpen}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: themeColors.primary,
                boxShadow: '0 6px 16px rgba(22,101,52,0.35)'
              }}
            >
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={handleProfileMenuClose}>
            <MenuItem component={Link} to="/ai-assistant" onClick={handleProfileMenuClose}>
              <ListItemIcon><SmartToyIcon fontSize="small" /></ListItemIcon>
              AI Assistant
            </MenuItem>
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
        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)',
            animation: 'fadeUpSoft .45s ease-out'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Payments Console
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Manage collections, verify incoming payments, and export reports in one place.
          </Typography>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: '16px',
                border: `2px solid ${themeColors.success}`,
                boxShadow: '0 8px 24px rgba(34, 197, 94, 0.15)',
                animation: 'fadeUpSoft .45s ease-out',
                background: `linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%)`,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(34, 197, 94, 0.25)' }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>Total Collected</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.success, mt: 1 }}>
                      {formatCurrency(summary.totalCollected)}
                    </Typography>
                  </Box>
                  <ReceiptIcon sx={{ fontSize: 40, color: themeColors.success, opacity: 0.2 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: '16px',
                border: `2px solid ${themeColors.primary}`,
                boxShadow: '0 8px 24px rgba(22, 101, 52, 0.15)',
                animation: 'fadeUpSoft .5s ease-out',
                background: `linear-gradient(135deg, rgba(22, 101, 52, 0.05) 0%, rgba(22, 101, 52, 0.02) 100%)`,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(22, 101, 52, 0.25)' }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>This Month</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.primary, mt: 1 }}>
                      {formatCurrency(summary.monthlyCollected)}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: themeColors.primary, opacity: 0.2 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: '16px',
                border: `2px solid ${themeColors.warning}`,
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
                animation: 'fadeUpSoft .55s ease-out',
                background: `linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.02) 100%)`,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(245, 158, 11, 0.25)' }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>Pending</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.warning, mt: 1 }}>
                      {formatCurrency(summary.pendingTotal)}
                    </Typography>
                  </Box>
                  <PendingIcon sx={{ fontSize: 40, color: themeColors.warning, opacity: 0.2 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                borderRadius: '16px',
                border: `2px solid ${themeColors.info}`,
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
                animation: 'fadeUpSoft .6s ease-out',
                background: `linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)`,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(59, 130, 246, 0.25)' }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>Collection Rate</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.info, mt: 1 }}>
                      {summary.collectionRate || 0}%
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: themeColors.info, opacity: 0.2 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 10px 26px rgba(15, 23, 42, 0.06)'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon sx={{ color: themeColors.primary }} />
                Monthly Dues: {formatCurrency(monthlyDuesAmount)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={8} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant="contained" startIcon={<SettingsIcon />} onClick={() => setDuesAmountDialogOpen(true)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary }}>
                Set Dues
              </Button>
              <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setReminderDialogOpen(true)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                Send Reminders
              </Button>
              <Button variant="outlined" onClick={handleExportPdf} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                Export PDF
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPayments} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Filters */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 10px 26px rgba(15, 23, 42, 0.06)'
          }}
        >
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
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={fetchPayments}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Payments Table */}
        <Paper
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
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
                  <TableCell sx={{ fontWeight: 600 }}>AI Receipt Risk</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} align="center"><CircularProgress /></TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={11} align="center">No payments found</TableCell></TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow
                      key={payment._id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(22, 163, 74, 0.04)'
                        }
                      }}
                    >
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
                        {payment.inclusions?.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {payment.inclusions.map((item) => (
                              <Typography key={item} variant="caption" color="textSecondary" display="block">
                                • {item}
                              </Typography>
                            ))}
                          </Box>
                        )}
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
                      <TableCell>
                        {getReceiptAiChip(payment.receiptAi)}
                        {payment.receiptAi?.flags?.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'block', color: themeColors.textSecondary, mt: 0.4 }}>
                            {payment.receiptAi.flags.slice(0, 2).join(', ')}
                          </Typography>
                        )}
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

        {/* Monthly Dues Amount Dialog */}
        <Dialog
          open={duesAmountDialogOpen}
          onClose={() => setDuesAmountDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: '18px' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Update Monthly Dues
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Set the monthly association dues amount that will be used for all newly generated dues invoices.
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Monthly Dues Amount"
              value={duesAmountDraft}
              onChange={(e) => setDuesAmountDraft(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setDuesAmountDialogOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={handleUpdateDuesAmount} disabled={processing} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
              {processing ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirm Cash Payment Dialog */}
        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: '18px' } }}
        >
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
            <Button onClick={() => setConfirmDialogOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleConfirmCashPayment} disabled={processing} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
              {processing ? <CircularProgress size={20} /> : 'Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* QRPh Payment Verification Dialog */}
        <Dialog open={qrphDialogOpen} onClose={() => setQrphDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
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
                {selectedQRPhPayment.receiptAi && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>AI Receipt Analysis</Typography>
                    <Box sx={{ mb: 1 }}>{getReceiptAiChip(selectedQRPhPayment.receiptAi)}</Box>
                    <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'block' }}>
                      Fraud score: {typeof selectedQRPhPayment.receiptAi.fraudScore === 'number' ? selectedQRPhPayment.receiptAi.fraudScore.toFixed(2) : 'N/A'}
                    </Typography>
                    {selectedQRPhPayment.receiptAi.flags?.length > 0 && (
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'block' }}>
                        Flags: {selectedQRPhPayment.receiptAi.flags.join(', ')}
                      </Typography>
                    )}
                    {selectedQRPhPayment.receiptAi.explanation && (
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'block', mt: 0.5 }}>
                        {selectedQRPhPayment.receiptAi.explanation}
                      </Typography>
                    )}
                  </Paper>
                )}

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
            <Button sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }} onClick={() => {
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
              sx={{ bgcolor: themeColors.success, '&:hover': { bgcolor: '#0da271' }, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              {processing ? 'Verifying...' : 'Verify & Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Receipt Image Viewer Dialog */}
        <Dialog 
          open={imageViewerOpen} 
          onClose={closeReceiptViewer} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '18px',
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
            <IconButton onClick={closeReceiptViewer} size="small">
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
                    src={selectedImageUrl || ''}
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
                    onClick={() => {
                      if (selectedImageUrl) {
                        window.open(selectedImageUrl, '_blank');
                      }
                    }}
                    disabled={!selectedImageUrl}
                    sx={{ borderRadius: 2 }}
                  >
                    Open Full Size
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      if (!selectedImageUrl) return;
                      const link = document.createElement('a');
                      link.href = selectedImageUrl;
                      link.download = selectedImage || 'receipt-image';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('Download started');
                    }}
                    disabled={!selectedImageUrl}
                    sx={{ borderRadius: 2 }}
                  >
                    Download Image
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={closeReceiptViewer} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Generate Invoices Dialog */}
        {/* Send Reminders Dialog */}
        <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Send Overdue Reminders
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              This will send SMS/Email reminders to all residents with overdue payments.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setReminderDialogOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
            <Button variant="contained" color="warning" onClick={handleSendReminders} disabled={processing} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
              {processing ? <CircularProgress size={20} /> : 'Send Reminders'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminPayments;