import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReportToolbar from '../components/ReportToolbar';
import { getBackendApiUrl } from '../utils/api';

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

const AdminLotManagement = () => {
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    vacant: 0,
    occupied: 0,
    reserved: 0
  });

  // Fetch lots data
  const fetchLots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/lots');
      const lotsData = Array.isArray(response.data?.data) ? response.data.data : [];

      setLots(lotsData);
      setFilteredLots(lotsData);

      // Calculate stats
      const total = lotsData.length;
      const vacant = lotsData.filter(lot => lot.status === 'vacant').length;
      const occupied = lotsData.filter(lot => lot.status === 'occupied').length;
      const reserved = lotsData.filter(lot => lot.status === 'reserved').length;

      setStats({ total, vacant, occupied, reserved });
    } catch (error) {
      console.error('Error fetching lots:', error);
      toast.error('Failed to load lots data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter lots based on search and filters
  useEffect(() => {
    let filtered = lots;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(lot =>
        lot.lotId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lot.occupiedBy?.firstName + ' ' + lot.occupiedBy?.lastName).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Phase filter
    if (phaseFilter !== 'all') {
      filtered = filtered.filter(lot => lot.phase === parseInt(phaseFilter));
    }

    // Block filter
    if (blockFilter !== 'all') {
      filtered = filtered.filter(lot => lot.block === parseInt(blockFilter));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lot => lot.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(lot => lot.type === typeFilter);
    }

    setFilteredLots(filtered);
  }, [lots, searchQuery, phaseFilter, blockFilter, statusFilter, typeFilter]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleExportPdf = async () => {
    try {
      const timezoneOffset = new Date().getTimezoneOffset();
      const response = await fetch(getBackendApiUrl(`/api/lots/export?format=pdf&timezoneOffset=${timezoneOffset}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('PDF Export Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        const text = await response.text();
        let message = 'Export failed';
        try {
          const errorData = JSON.parse(text);
          message = errorData.error || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      if (!response.headers.get('content-type')?.includes('application/pdf')) {
        const text = await response.text();
        throw new Error(text || 'Export failed: invalid PDF response');
      }

      const blob = await response.blob();
      console.log('PDF Blob:', {
        size: blob.size,
        type: blob.type
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const exportTime = new Date();
      const timestamp = exportTime.toISOString().replace(/[:.]/g, '-').split('Z')[0];
      a.download = `VIMS_Lots_Export_${timestamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export PDF');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'vacant': return themeColors.success;
      case 'occupied': return themeColors.primary;
      case 'reserved': return themeColors.warning;
      default: return themeColors.textSecondary;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return `₱${Number(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

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
      {/* Top Navigation */}
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
          <BusinessIcon sx={{ mr: 1.5, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Lot Management
          </Typography>
          <Button
            onClick={() => navigate('/dashboard')}
            sx={{
              color: themeColors.primary,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(34, 197, 94, 0.12)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.22)' }
            }}
          >
            Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: themeColors.primary, fontWeight: 700 }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Total Lots
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: themeColors.success, fontWeight: 700 }}>
                  {stats.vacant}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Vacant
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: themeColors.primary, fontWeight: 700 }}>
                  {stats.occupied}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Occupied
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: themeColors.warning, fontWeight: 700 }}>
                  {stats.reserved}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Reserved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper
          sx={{
            mb: 3,
            p: 3,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Search lots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: themeColors.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Phase</InputLabel>
                <Select
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value)}
                  label="Phase"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Phases</MenuItem>
                  {[1, 2, 3, 4, 5].map(phase => (
                    <MenuItem key={phase} value={phase}>Phase {phase}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Block</InputLabel>
                <Select
                  value={blockFilter}
                  onChange={(e) => setBlockFilter(e.target.value)}
                  label="Block"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Blocks</MenuItem>
                  {[1, 2, 3, 4, 5].map(block => (
                    <MenuItem key={block} value={block}>Block {block}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="vacant">Vacant</MenuItem>
                  <MenuItem value="occupied">Occupied</MenuItem>
                  <MenuItem value="reserved">Reserved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setPhaseFilter('all');
                  setBlockFilter('all');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, height: '40px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Toolbar */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <ReportToolbar onExportPdf={handleExportPdf} />
        </Box>

        {/* Lots Table */}
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
                  <TableCell sx={{ fontWeight: 700 }}>Lot ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Occupied By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLots.map((lot) => (
                  <TableRow key={lot._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {lot.lotId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Phase {lot.phase}, Block {lot.block}, Lot {lot.lotNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                        {lot.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{lot.type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{lot.sqm} sqm</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatCurrency(lot.price)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lot.status.charAt(0).toUpperCase() + lot.status.slice(1)}
                        sx={{
                          bgcolor: `${getStatusColor(lot.status)}20`,
                          color: getStatusColor(lot.status),
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {lot.occupiedBy ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {lot.occupiedBy.firstName} {lot.occupiedBy.lastName}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          Vacant
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredLots.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 48, color: themeColors.textSecondary, mb: 2 }} />
              <Typography variant="h6" sx={{ color: themeColors.textSecondary }}>
                No lots found matching your criteria
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminLotManagement;