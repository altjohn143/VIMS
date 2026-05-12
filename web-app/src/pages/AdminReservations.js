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
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
  Build as BuildIcon,
  MeetingRoom as MeetingRoomIcon,
  ReportProblemOutlined as ReportProblemOutlinedIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Add as AddIcon } from '@mui/icons-material';

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [resources, setResources] = useState({ venue: [], equipment: [] });
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    resourceType: 'venue',
    resourceName: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    quantity: 1,
    status: 'pending',
    notes: '',
  });

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
      overdue: reservations.filter(
        (reservation) => new Date(reservation.endDate) < now && !['returned', 'cancelled'].includes(reservation.status)
      ).length,
    };
  }, [reservations]);

  useEffect(() => {
    fetchReservations();
    fetchResources();
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

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reservations/resources', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setResources(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      setSnackbar({ open: true, message: 'Failed to fetch resources', severity: 'error' });
    }
  };

  const handleOpenDialog = (reservation = null) => {
    if (reservation) {
      setEditingReservation(reservation);
      setFormData({
        resourceType: reservation.resourceType,
        resourceName: reservation.resourceName,
        description: reservation.description || '',
        startDate: new Date(reservation.startDate),
        endDate: new Date(reservation.endDate),
        quantity: reservation.quantity || 1,
        status: reservation.status,
        notes: reservation.notes || '',
      });
    } else {
      setEditingReservation(null);
      setFormData({
        resourceType: 'venue',
        resourceName: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        quantity: 1,
        status: 'pending',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingReservation(null);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };

      if (editingReservation) {
        await axios.put(`/api/reservations/${editingReservation._id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: 'Reservation updated successfully', severity: 'success' });
      } else {
        await axios.post('/api/reservations', data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: 'Reservation created successfully', severity: 'success' });
      }

      fetchReservations();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving reservation:', error);
      setSnackbar({ open: true, message: 'Failed to save reservation', severity: 'error' });
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
    return type === 'venue' ? <MeetingRoomIcon /> : <BuildIcon />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      case 'borrowed': return 'warning';
      case 'return_initiated': return 'secondary';
      case 'returned': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircleIcon />;
      case 'cancelled': return <CancelIcon />;
      case 'borrowed': return <BuildIcon />;
      case 'return_initiated': return <UndoIcon />;
      case 'returned': return <EventAvailableIcon />;
      default: return <ScheduleIcon />;
    }
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
      fetchResources();
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                  const isOverdue = new Date(reservation.endDate) < new Date() && reservation.status !== 'returned' && reservation.status !== 'cancelled';
                  const displayStatus = isOverdue ? 'Overdue' : reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1);
                  const statusColor = isOverdue ? 'error' : getStatusColor(reservation.status);
                  const statusIcon = isOverdue ? <ReportProblemOutlinedIcon /> : getStatusIcon(reservation.status);

                  return (
                    <TableRow key={reservation._id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getResourceIcon(reservation.resourceType)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {reservation.resourceType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.resourceName}
                        </Typography>
                        {reservation.description && (
                          <Typography variant="caption" color="text.secondary">
                            {reservation.description}
                          </Typography>
                        )}
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
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleOpenDialog(reservation)} size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
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
                        {['return_initiated', 'borrowed'].includes(reservation.status) && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleConfirmReceipt(reservation._id)}
                            startIcon={<CheckCircleIcon />}
                            sx={{ textTransform: 'none', mr: 1 }}
                          >
                            {reservation.status === 'return_initiated' ? 'Confirm Return' : 'Confirm Receipt'}
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

        {/* Add/Edit Dialog */}
        <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingReservation ? 'Edit Reservation' : 'Add New Reservation'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Resource Type</InputLabel>
                  <Select
                    value={formData.resourceType}
                    label="Resource Type"
                    onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                  >
                    <MenuItem value="venue">Venue</MenuItem>
                    <MenuItem value="equipment">Equipment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Resource Name</InputLabel>
                  <Select
                    value={formData.resourceName}
                    label="Resource Name"
                    onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
                  >
                    {(resources[formData.resourceType] || []).map((item) => (
                      <MenuItem key={item} value={item}>{item}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  onClick={handleResourceDialogOpen}
                  sx={{ mt: 1, ml: 1 }}
                  size="small"
                  color="primary"
                  title="Add new resource"
                >
                  <AddIcon />
                </IconButton>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => setFormData({ ...formData, startDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Start Time"
                  value={formData.startDate}
                  onChange={(time) => {
                    const newDate = new Date(formData.startDate);
                    newDate.setHours(time.getHours(), time.getMinutes());
                    setFormData({ ...formData, startDate: newDate });
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => setFormData({ ...formData, endDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="End Time"
                  value={formData.endDate}
                  onChange={(time) => {
                    const newDate = new Date(formData.endDate);
                    newDate.setHours(time.getHours(), time.getMinutes());
                    setFormData({ ...formData, endDate: newDate });
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="borrowed">Borrowed</MenuItem>
                    <MenuItem value="returned">Returned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingReservation ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

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
    </LocalizationProvider>
  );
};

export default AdminReservations;