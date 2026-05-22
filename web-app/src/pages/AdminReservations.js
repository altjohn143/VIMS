import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  AppBar,
  Toolbar,
  Avatar
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
  Build as BuildIcon,
  MeetingRoom as MeetingRoomIcon,
  ReportProblemOutlined as ReportProblemOutlinedIcon
} from '@mui/icons-material';
import axios from 'axios';

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);

  const [resourceFormData, setResourceFormData] = useState({
    type: 'venue',
    name: '',
    description: '',
  });

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === 'pending').length,
      confirmed: reservations.filter((reservation) => reservation.status === 'confirmed').length,
      cancelled: reservations.filter((reservation) => reservation.status === 'cancelled').length,
      borrowed: reservations.filter((reservation) => reservation.status === 'borrowed').length,
      returned: reservations.filter((reservation) => reservation.status === 'returned').length,
      checkedOut: reservations.filter((reservation) => reservation.status === 'checked_out').length,
      overdue: reservations.filter(
        (reservation) => new Date(reservation.endDate) < now && !['returned', 'checked_out', 'cancelled'].includes(reservation.status)
      ).length,
    };
  }, [reservations]);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reservations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setReservations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setSnackbar({ open: true, message: 'Failed to fetch reservations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: 'Reservation deleted successfully', severity: 'success' });
      fetchReservations();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      setSnackbar({ open: true, message: 'Failed to delete reservation', severity: 'error' });
    }
  };

  const handleUpdateStatus = async (reservationId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/reservations/${reservationId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: `Reservation ${status === 'confirmed' ? 'approved' : 'denied'} successfully`, severity: 'success' });
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      setSnackbar({ open: true, message: 'Failed to update reservation status', severity: 'error' });
    }
  };

  const handleConfirmReceipt = async (reservationId) => {
    if (!window.confirm('Confirm receipt of this returned item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/reservations/${reservationId}/confirm-receipt`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: response.data.message || 'Item receipt confirmed successfully', severity: 'success' });
      fetchReservations();
    } catch (error) {
      console.error('Error confirming receipt:', error);
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to confirm item receipt', severity: 'error' });
    }
  };

  const getResourceIcon = (type) => {
    if (type === 'venue') return <MeetingRoomIcon />;
    if (type === 'equipment') return <BuildIcon />;
    return <MeetingRoomIcon />;
  };

  const getReservationType = (reservation) => {
    const items = reservation.items || [];
    if (items.length === 0) {
      return reservation.resourceType || 'unknown';
    }
    const uniqueTypes = [...new Set(items.map((item) => item.resourceType))];
    return uniqueTypes.length === 1 ? uniqueTypes[0] : 'mixed';
  };

  const getReservationTitle = (reservation) => {
    if (!reservation.items || reservation.items.length === 0) {
      return reservation.resourceName || 'Unknown resource';
    }
    return `${reservation.items.length} item${reservation.items.length > 1 ? 's' : ''}`;
  };

  const renderReservationItems = (reservation) => {
    if (!reservation.items || reservation.items.length === 0) {
      return null;
    }
    return reservation.items.map((item, idx) => (
      <Typography key={idx} variant="caption" color="text.secondary" display="block" sx={{ ml: 0.5 }}>
        • {item.resourceName} (Qty: {item.quantity})
      </Typography>
    ));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      case 'borrowed': return 'warning';
      case 'returned': return 'info';
      case 'checked_out': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircleIcon />;
      case 'cancelled': return <CancelIcon />;
      case 'borrowed': return <BuildIcon />;
      case 'returned': return <EventAvailableIcon />;
      case 'checked_out': return <EventAvailableIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const formatStatusLabel = (status) => {
    if (status === 'checked_out') return 'Checked Out';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleResourceDialogOpen = () => {
    setResourceFormData({
      type: 'venue',
      name: '',
      description: '',
    });
    setResourceDialogOpen(true);
  };

  const handleResourceDialogClose = () => {
    setResourceDialogOpen(false);
  };

  const handleResourceSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/resources', resourceFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: 'Resource added successfully', severity: 'success' });
      handleResourceDialogClose();
    } catch (error) {
      console.error('Error adding resource:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add resource';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(255,255,255,0.96)',
            color: 'inherit',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            mb: 3,
          }}
        >
          <Toolbar sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Avatar sx={{ bgcolor: '#166534' }}>
              <EventAvailableIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
                Reservation Requests
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                Manage reservation requests, approvals, cancellations, and return tracking.
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{ textTransform: 'none', borderRadius: 2.5 }}
              onClick={fetchReservations}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 2.5 }}
              onClick={handleResourceDialogOpen}
            >
              Add Resources
            </Button>
          </Toolbar>
        </AppBar>

        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#0f172a',
            background: '#f8fafc',
            border: '1px solid rgba(22, 163, 74, 0.12)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Reservation Requests Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(15, 23, 42, 0.75)', mb: 2 }}>
            Review all reservation requests for venues and equipment from residents, and track their current status.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[
              { label: 'Total Requests', value: stats.total, color: '#2563eb' },
              { label: 'Pending', value: stats.pending, color: '#f59e0b' },
              { label: 'Confirmed', value: stats.confirmed, color: '#16a34a' },
              { label: 'Borrowed', value: stats.borrowed, color: '#0ea5e9' },
              { label: 'Returned', value: stats.returned, color: '#64748b' },
              { label: 'Checked Out', value: stats.checkedOut, color: '#7c3aed' },
              { label: 'Overdue', value: stats.overdue, color: '#dc2626' },
            ].map((stat) => (
              <Paper
                key={stat.label}
                sx={{
                  minWidth: 150,
                  p: 2,
                  borderRadius: '18px',
                  backgroundColor: '#fff',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  flex: '1 1 150px',
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color }}>
                  {stat.value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Reserved By</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => {
                  const isOverdue = new Date(reservation.endDate) < new Date() && !['returned', 'checked_out', 'cancelled'].includes(reservation.status);
                  const displayStatus = isOverdue ? 'Overdue' : formatStatusLabel(reservation.status);
                  const statusColor = isOverdue ? 'error' : getStatusColor(reservation.status);
                  const statusIcon = isOverdue ? <ReportProblemOutlinedIcon /> : getStatusIcon(reservation.status);

                  return (
                    <TableRow key={reservation._id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getResourceIcon(getReservationType(reservation))}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {getReservationType(reservation)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {getReservationTitle(reservation)}
                        </Typography>
                        {reservation.items && reservation.items.length > 0 ? (
                          renderReservationItems(reservation)
                        ) : reservation.description ? (
                          <Typography variant="caption" color="text.secondary">
                            {reservation.description}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {reservation.reservedBy?.firstName} {reservation.reservedBy?.lastName}
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.startDate).toLocaleDateString()}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reservation.startDate).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.endDate).toLocaleDateString()}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reservation.endDate).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip
                            icon={statusIcon}
                            label={displayStatus}
                            color={statusColor}
                            size="small"
                          />
                          {reservation.status === 'cancelled' && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Cancelled by {reservation.cancelledBy?.firstName ? `${reservation.cancelledBy.firstName} ${reservation.cancelledBy.lastName}` : 'Admin'}
                              </Typography>
                              {reservation.cancelledReason && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Reason: {reservation.cancelledReason}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {reservation.status === 'pending' && (
                          <>
                            <Button
                              size="small"
                              color="success"
                              onClick={() => handleUpdateStatus(reservation._id, 'confirmed')}
                              startIcon={<CheckCircleIcon />}
                              sx={{ textTransform: 'none', mr: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleUpdateStatus(reservation._id, 'cancelled')}
                              startIcon={<CancelIcon />}
                              sx={{ textTransform: 'none' }}
                            >
                              Deny
                            </Button>
                          </>
                        )}
                        {reservation.status === 'borrowed' && getReservationType(reservation) === 'equipment' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleConfirmReceipt(reservation._id)}
                            startIcon={<CheckCircleIcon />}
                            sx={{ textTransform: 'none', mr: 1 }}
                          >
                            Confirm Receipt
                          </Button>
                        )}
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDelete(reservation._id)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add Resource Dialog */}
        <Dialog open={resourceDialogOpen} onClose={handleResourceDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Resource</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Resource Type</InputLabel>
                  <Select
                    value={resourceFormData.type}
                    label="Resource Type"
                    onChange={(e) => setResourceFormData({ ...resourceFormData, type: e.target.value })}
                  >
                    <MenuItem value="venue">Venue</MenuItem>
                    <MenuItem value="equipment">Equipment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Resource Name"
                  value={resourceFormData.name}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={resourceFormData.description}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleResourceDialogClose}>Cancel</Button>
            <Button
              onClick={handleResourceSubmit}
              variant="contained"
              disabled={!resourceFormData.name.trim()}
            >
              Add Resource
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
    </Container>
  );
};

export default AdminReservations;
