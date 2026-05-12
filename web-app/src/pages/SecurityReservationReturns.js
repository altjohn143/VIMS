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
} from '@mui/material';
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

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Return Verification
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
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
          <Table>
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
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleConfirmReceipt(reservation._id)}
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
