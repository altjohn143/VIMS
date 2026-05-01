import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  EventAvailable as EventAvailableIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
  MeetingRoom as MeetingRoomIcon,
  Add as AddIcon,
  History as HistoryIcon
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

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    resourceType: 'venue',
    resourceName: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    quantity: 1,
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
        // Filter to show only current user's reservations
        const userReservations = response.data.data.filter(
          res => res.reservedBy._id === JSON.parse(atob(token.split('.')[1])).id
        );
        setReservations(userReservations);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setSnackbar({ open: true, message: 'Failed to fetch reservations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      resourceType: 'venue',
      resourceName: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      quantity: 1,
      notes: '',
    });
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };

      await axios.post('/api/reservations', data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ open: true, message: 'Reservation request submitted successfully', severity: 'success' });
      fetchReservations();
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating reservation:', error);
      setSnackbar({ open: true, message: 'Failed to submit reservation request', severity: 'error' });
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
            My Reservations
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{ borderRadius: '28px' }}
          >
            New Reservation
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Reserve
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<MeetingRoomIcon />}
                    onClick={() => {
                      setFormData({ ...formData, resourceType: 'venue' });
                      setOpen(true);
                    }}
                    fullWidth
                  >
                    Reserve Venue
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<BuildIcon />}
                    onClick={() => {
                      setFormData({ ...formData, resourceType: 'equipment' });
                      setOpen(true);
                    }}
                    fullWidth
                  >
                    Reserve Equipment
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Reservation History */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <HistoryIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Reservation History
                  </Typography>
                </Box>

                {reservations.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <EventAvailableIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No reservations yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create your first reservation request
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {reservations.map((reservation, index) => (
                      <React.Fragment key={reservation._id}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon>
                            {getResourceIcon(reservation.resourceType)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {reservation.resourceName}
                                </Typography>
                                <Chip
                                  icon={getStatusIcon(reservation.status)}
                                  label={reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                  color={getStatusColor(reservation.status)}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(reservation.startDate).toLocaleDateString()} - {new Date(reservation.endDate).toLocaleDateString()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {reservation.description}
                                </Typography>
                                {reservation.notes && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Notes: {reservation.notes}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < reservations.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Reservation Dialog */}
        <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            New Reservation Request
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Resource Type</InputLabel>
                  <Select
                    value={formData.resourceType}
                    label="Resource Type"
                    onChange={(e) => setFormData({ ...formData, resourceType: e.target.value, resourceName: '' })}
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
                  label="Description/Purpose"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your reservation purpose"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => setFormData({ ...formData, startDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDate={new Date()}
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
                  minDate={formData.startDate}
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
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requirements or notes"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              Submit Request
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

export default Reservations;