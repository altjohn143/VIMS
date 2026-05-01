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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const VENUES = [
  'Covered Court',
  'Swimming Pool',
  'Multi-Purpose Hall',
  'Function Room',
  'Conference Room',
];

const EQUIPMENT = [
  'Tables',
  'Chairs',
  'Speakers',
  'Microphones',
  'Projector',
  'Podium',
];

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      case 'borrowed': return 'warning';
      case 'returned': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircleIcon />;
      case 'cancelled': return <CancelIcon />;
      case 'borrowed': return <BuildIcon />;
      case 'returned': return <EventAvailableIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getResourceIcon = (type) => {
    return type === 'venue' ? <MeetingRoomIcon /> : <BuildIcon />;
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Reservation Logs
          </Typography>
        </Box>

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
                        <Chip
                          icon={statusIcon}
                          label={displayStatus}
                          color={statusColor}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleOpenDialog(reservation)} size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
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
                    {(formData.resourceType === 'venue' ? VENUES : EQUIPMENT).map((item) => (
                      <MenuItem key={item} value={item}>{item}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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