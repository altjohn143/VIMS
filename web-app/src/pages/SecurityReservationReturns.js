import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  EventAvailable as EventAvailableIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';

const SecurityReservationReturns = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reservations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setReservations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching return reservations:', error);
      setSnackbar({ open: true, message: 'Failed to load return requests', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatItems = (reservation) => {
    if (reservation.items && reservation.items.length > 0) {
      return reservation.items.map((item) => `${item.resourceName} (x${item.quantity})`).join(', ');
    }
    return reservation.resourceName || 'Unknown item';
  };

  const getStatusLabel = (status) => {
    if (status === 'return_initiated') return 'Return Ready';
    if (status === 'borrowed') return 'Borrowed';
    if (status === 'returned') return 'Returned';
    return status;
  };

  const handleConfirmReceipt = async (reservationId) => {
    if (!window.confirm('Confirm receipt of the returned items?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/reservations/${reservationId}/confirm-receipt`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: response.data.message || 'Receipt confirmed', severity: 'success' });
      fetchReservations();
    } catch (error) {
      console.error('Error confirming receipt:', error);
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to confirm receipt', severity: 'error' });
    }
  };

  const pendingReturns = reservations.filter(r => r.status === 'return_initiated').length;
  const totalReturns = reservations.length;
  const completedReturns = reservations.filter(r => r.status === 'returned').length;

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<EventAvailableIcon />}
          onClick={() => window.history.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h3" gutterBottom sx={{ mb: 0, mr: 2 }}>
          Return Verification
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchReservations}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {pendingReturns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Returns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventAvailableIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {totalReturns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Returns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {completedReturns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Returns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" color="textSecondary" gutterBottom>
        Review return-ready reservations and confirm receipt when the resident brings the items to security.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : reservations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography>No return requests are currently pending.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table sx={{ '& .MuiTableCell-root': { fontSize: '1.1rem', padding: '16px' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Resident</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Return Requested</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation._id}>
                  <TableCell>{reservation.reservedBy?.firstName} {reservation.reservedBy?.lastName}</TableCell>
                  <TableCell>{formatItems(reservation)}</TableCell>
                  <TableCell>{formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}</TableCell>
                  <TableCell>{getStatusLabel(reservation.status)}</TableCell>
                  <TableCell>{reservation.returnInitiatedAt ? formatDate(reservation.returnInitiatedAt) : '—'}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="large"
                      variant="contained"
                      color="success"
                      onClick={() => handleConfirmReceipt(reservation._id)}
                      sx={{ fontSize: '1.1rem', padding: '12px 24px' }}
                    >
                      {reservation.status === 'return_initiated' ? 'Confirm Return' : 'Confirm Receipt'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SecurityReservationReturns;
