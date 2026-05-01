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
  Divider,
  Paper,
  Avatar,
  Stack
} from '@mui/material';
import {
  EventAvailable as EventAvailableIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
  MeetingRoom as MeetingRoomIcon,
  Add as AddIcon,
  History as HistoryIcon,
  ArrowOutward as ArrowOutwardIcon,
  Inventory2Outlined as InventoryIcon,
  CalendarMonth as CalendarMonthIcon,
  Notes as NotesIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  AccessTime as AccessTimeIcon
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

const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  primaryLight: '#22c55e',
  primarySoft: '#dcfce7',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)',
  muted: '#e5e7eb'
};

const screenFade = {
  '@keyframes screenFadeIn': {
    from: { opacity: 0, transform: 'translateY(14px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  '@keyframes slideUpSoft': {
    from: { opacity: 0, transform: 'translateY(18px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  '@keyframes cardPop': {
    from: { opacity: 0, transform: 'translateY(16px) scale(0.985)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' }
  },
  '@media (prefers-reduced-motion: reduce)': {
    '*': { animation: 'none !important', transition: 'none !important' }
  }
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
    '& fieldset': {
      borderColor: 'rgba(15,23,42,0.10)'
    },
    '&:hover fieldset': {
      borderColor: 'rgba(22,101,52,0.34)'
    },
    '&.Mui-focused fieldset': {
      borderColor: themeColors.primary
    }
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: themeColors.primary
  }
};

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
        setReservations(response.data.data);
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

  const pendingCount = reservations.filter((reservation) => !['confirmed', 'cancelled', 'returned'].includes(reservation.status)).length;
  const confirmedCount = reservations.filter((reservation) => reservation.status === 'confirmed').length;
  const venueCount = reservations.filter((reservation) => reservation.resourceType === 'venue').length;
  const equipmentCount = reservations.filter((reservation) => reservation.resourceType === 'equipment').length;

  const statCards = [
    {
      label: 'Total Requests',
      value: reservations.length,
      helper: 'all reservation records',
      icon: <CalendarMonthIcon sx={{ fontSize: 42 }} />,
      bg: 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
      accent: '#dcfce7'
    },
    {
      label: 'Confirmed',
      value: confirmedCount,
      helper: 'approved reservations',
      icon: <CheckCircleIcon sx={{ fontSize: 42 }} />,
      bg: 'linear-gradient(135deg, #18a34a 0%, #15803d 100%)',
      accent: '#dcfce7'
    },
    {
      label: 'Pending / Active',
      value: pendingCount,
      helper: 'needs update or review',
      icon: <ScheduleIcon sx={{ fontSize: 42 }} />,
      bg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
      accent: '#dbeafe'
    },
    {
      label: 'Equipment',
      value: equipmentCount,
      helper: `${venueCount} venue request${venueCount === 1 ? '' : 's'}`,
      icon: <InventoryIcon sx={{ fontSize: 42 }} />,
      bg: 'linear-gradient(135deg, #e02424 0%, #b91c1c 100%)',
      accent: '#fee2e2'
    }
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: themeColors.primary }} />
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          ...screenFade,
          minHeight: '100vh',
          background: `
            radial-gradient(circle at top left, rgba(34,197,94,0.08), transparent 24%),
            radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
            ${themeColors.background}
          `,
          py: { xs: 2, md: 3 }
        }}
      >
        <Container maxWidth={false}
          >
          <Box mb={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowOutwardIcon sx={{ transform: 'rotate(180deg)' }} />}
              onClick={() => window.history.back()}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 800,
                borderColor: 'rgba(15,23,42,0.12)',
                color: '#0f172a',
                '&:hover': { bgcolor: '#f1f5f9' }
              }}
            >
              Back
            </Button>
          </Box> sx={{ px: { xs: 2, md: 3 } }}
          <Grid container spacing={2.25}>
            <Grid item xs={12}>
              <Paper
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '22px',
                  minHeight: { xs: 230, md: 250 },
                  backgroundColor: '#0f172a',
                  border: `1px solid ${themeColors.border}`,
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
                  animation: 'screenFadeIn 0.55s ease'
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'url("https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(2,6,23,0.86) 0%, rgba(2,6,23,0.68) 42%, rgba(2,6,23,0.24) 72%, rgba(2,6,23,0.10) 100%)'
                  }}
                />

                <Grid container sx={{ position: 'relative', zIndex: 1, minHeight: { xs: 230, md: 250 } }}>
                  <Grid item xs={12} md={7}>
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        p: { xs: 2.5, md: 3.5 },
                        color: 'white',
                        animation: 'slideUpSoft 0.65s ease'
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          color: '#4ade80',
                          textTransform: 'uppercase',
                          mb: 1.2
                        }}
                      >
                        Casimiro Westville Homes • Reservations
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: { xs: '1.9rem', md: '2.45rem' },
                          fontWeight: 900,
                          lineHeight: 1.05,
                          mb: 1
                        }}
                      >
                        Reserve community spaces without the back-and-forth.
                      </Typography>

                      <Typography
                        sx={{
                          color: 'rgba(255,255,255,0.78)',
                          fontWeight: 500,
                          maxWidth: 570,
                          fontSize: { xs: '0.92rem', md: '1rem' },
                          lineHeight: 1.65
                        }}
                      >
                        Submit venue and equipment requests, track their status, and keep all reservation details organized in one clean view.
                      </Typography>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.6 }}>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleOpenDialog}
                          sx={{
                            bgcolor: themeColors.primaryLight,
                            color: '#052e16',
                            borderRadius: '14px',
                            px: 2.2,
                            py: 1.15,
                            fontWeight: 900,
                            textTransform: 'none',
                            boxShadow: '0 12px 26px rgba(34,197,94,0.24)',
                            '&:hover': {
                              bgcolor: '#4ade80',
                              transform: 'translateY(-1px)'
                            },
                            '&:active': {
                              transform: 'translateY(1px) scale(0.99)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          New Reservation
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<HistoryIcon />}
                          onClick={() => document.getElementById('reservation-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          sx={{
                            borderColor: 'rgba(255,255,255,0.28)',
                            color: 'white',
                            borderRadius: '14px',
                            px: 2.2,
                            py: 1.15,
                            fontWeight: 900,
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#86efac',
                              bgcolor: 'rgba(255,255,255,0.08)',
                              transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          View History
                        </Button>
                      </Stack>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Grid container sx={{ height: '100%' }}>
                      {statCards.slice(0, 4).map((stat, index) => (
                        <Grid item xs={6} key={stat.label}>
                          <Box
                            sx={{
                              height: '100%',
                              p: 2.5,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              borderLeft: { md: '1px solid rgba(255,255,255,0.10)' },
                              borderTop: {
                                xs: index > 1 ? '1px solid rgba(255,255,255,0.10)' : 'none',
                                md: index > 1 ? '1px solid rgba(255,255,255,0.10)' : 'none'
                              },
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                              {stat.value}
                            </Typography>
                            <Typography sx={{ mt: 0.8, fontSize: '0.86rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                              {stat.label}
                            </Typography>
                            <Typography sx={{ mt: 1, fontSize: '0.76rem', color: '#86efac', fontWeight: 700 }}>
                              ↗ {stat.helper}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {statCards.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Card
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 164,
                    borderRadius: '20px',
                    color: 'white',
                    background: stat.bg,
                    boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    animation: `cardPop ${0.35 + index * 0.08}s ease`,
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 24px 40px rgba(15,23,42,0.16)'
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      top: -72,
                      right: -52,
                      bgcolor: 'rgba(255,255,255,0.15)'
                    }
                  }}
                >
                  <CardContent
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      p: 2.25,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.20 }}>
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                        {stat.value}
                      </Typography>
                      <Typography sx={{ mt: 0.7, fontSize: '0.94rem', fontWeight: 700 }}>
                        {stat.label}
                      </Typography>
                      <Typography sx={{ mt: 1.2, fontSize: '0.78rem', color: stat.accent, fontWeight: 700 }}>
                        ↗ {stat.helper}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  height: '100%',
                  borderRadius: '20px',
                  border: `1px solid ${themeColors.border}`,
                  boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                  overflow: 'hidden',
                  animation: 'slideUpSoft 0.7s ease'
                }}
              >
                <Box sx={{ px: 2.25, py: 2, bgcolor: 'white' }}>
                  <Typography sx={{ fontSize: '1.06rem', fontWeight: 900, color: themeColors.textPrimary }}>
                    Quick Reserve
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: '0.84rem', color: themeColors.textSecondary, fontWeight: 600 }}>
                    Start a request based on what you need.
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.15 }}>
                  {[
                    {
                      title: 'Reserve Venue',
                      subtitle: 'Court, pool, hall, or room',
                      icon: <MeetingRoomIcon />,
                      type: 'venue'
                    },
                    {
                      title: 'Reserve Equipment',
                      subtitle: 'Tables, speakers, projector, and more',
                      icon: <BuildIcon />,
                      type: 'equipment'
                    }
                  ].map((action) => (
                    <Paper
                      key={action.type}
                      elevation={0}
                      onClick={() => {
                        setFormData({ ...formData, resourceType: action.type, resourceName: '' });
                        setOpen(true);
                      }}
                      sx={{
                        px: 1.5,
                        py: 1.4,
                        borderRadius: '16px',
                        border: '1px solid rgba(15,23,42,0.06)',
                        bgcolor: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          bgcolor: '#f0fdf4',
                          borderColor: 'rgba(34,197,94,0.18)',
                          boxShadow: '0 10px 20px rgba(15,23,42,0.05)'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '12px',
                          bgcolor: '#ecfdf5',
                          color: themeColors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: themeColors.textPrimary }}>
                          {action.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: themeColors.textSecondary, fontWeight: 500 }}>
                          {action.subtitle}
                        </Typography>
                      </Box>
                      <KeyboardArrowRightIcon sx={{ color: '#cbd5e1' }} />
                    </Paper>
                  ))}
                </Box>

                <Box sx={{ px: 2, pb: 2 }}>
                  <Alert
                    severity="info"
                    icon={<AccessTimeIcon />}
                    sx={{
                      borderRadius: '16px',
                      bgcolor: '#eff6ff',
                      color: '#1e3a8a',
                      '& .MuiAlert-icon': { color: '#2563eb' }
                    }}
                  >
                    Submit requests ahead of time so admin can review availability.
                  </Alert>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={8} id="reservation-history">
              <Paper
                sx={{
                  borderRadius: '20px',
                  border: `1px solid ${themeColors.border}`,
                  boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                  overflow: 'hidden',
                  animation: 'slideUpSoft 0.8s ease'
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'white',
                    gap: 2,
                    flexWrap: 'wrap'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon sx={{ color: themeColors.primary }} />
                    <Typography sx={{ fontSize: '1.06rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      Reservation History
                    </Typography>
                    <Chip
                      label={`${reservations.length} record${reservations.length === 1 ? '' : 's'}`}
                      size="small"
                      sx={{
                        bgcolor: themeColors.primarySoft,
                        color: themeColors.primary,
                        fontWeight: 800,
                        borderRadius: '999px'
                      }}
                    />
                  </Box>

                  <Button
                    variant="text"
                    endIcon={<ArrowOutwardIcon />}
                    onClick={fetchReservations}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 800,
                      color: themeColors.primary
                    }}
                  >
                    Refresh
                  </Button>
                </Box>

                <Divider />

                {reservations.length === 0 ? (
                  <Box textAlign="center" py={7} px={2}>
                    <Avatar
                      sx={{
                        width: 72,
                        height: 72,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: themeColors.primarySoft,
                        color: themeColors.primary
                      }}
                    >
                      <EventAvailableIcon sx={{ fontSize: 36 }} />
                    </Avatar>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      No reservations yet
                    </Typography>
                    <Typography sx={{ color: themeColors.textSecondary, fontWeight: 600, mt: 0.6 }}>
                      Create your first reservation request to get started.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenDialog}
                      sx={{
                        mt: 2.4,
                        borderRadius: '14px',
                        textTransform: 'none',
                        fontWeight: 900,
                        bgcolor: themeColors.primary,
                        boxShadow: '0 12px 22px rgba(22,101,52,0.18)',
                        '&:hover': { bgcolor: themeColors.primaryDark }
                      }}
                    >
                      New Reservation
                    </Button>
                  </Box>
                ) : (
                  <List sx={{ px: 1.5, py: 1 }}>
                    {reservations.map((reservation, index) => (
                      <React.Fragment key={reservation._id}>
                        <ListItem
                          alignItems="flex-start"
                          sx={{
                            borderRadius: '16px',
                            py: 1.4,
                            px: 1,
                            transition: 'background-color 0.2s ease',
                            '&:hover': { bgcolor: '#f8fafc' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 48 }}>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: reservation.resourceType === 'venue' ? '#ecfdf5' : '#eff6ff',
                                color: reservation.resourceType === 'venue' ? themeColors.primary : '#2563eb'
                              }}
                            >
                              {getResourceIcon(reservation.resourceType)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography sx={{ fontSize: '0.98rem', fontWeight: 900, color: themeColors.textPrimary }}>
                                  {reservation.resourceName}
                                </Typography>
                                <Chip
                                  icon={getStatusIcon(reservation.status)}
                                  label={reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                  color={getStatusColor(reservation.status)}
                                  size="small"
                                  sx={{
                                    borderRadius: '999px',
                                    fontWeight: 800,
                                    '& .MuiChip-icon': { fontSize: 16 }
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.8 }}>
                                <Typography sx={{ fontSize: '0.84rem', color: themeColors.textSecondary, fontWeight: 700 }}>
                                  {new Date(reservation.startDate).toLocaleDateString()} - {new Date(reservation.endDate).toLocaleDateString()}
                                </Typography>
                                <Typography sx={{ fontSize: '0.84rem', color: themeColors.textSecondary, fontWeight: 500, mt: 0.4 }}>
                                  {reservation.description || 'No description provided.'}
                                </Typography>
                                {reservation.notes && (
                                  <Typography sx={{ fontSize: '0.82rem', color: themeColors.textSecondary, mt: 0.8, display: 'flex', gap: 0.8, alignItems: 'center' }}>
                                    <NotesIcon sx={{ fontSize: 16 }} /> Notes: {reservation.notes}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < reservations.length - 1 && <Divider sx={{ mx: 1 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Dialog
          open={open}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 24px 70px rgba(15,23,42,0.24)'
            }
          }}
        >
          <DialogTitle
            sx={{
              p: 0,
              bgcolor: '#0f172a',
              color: 'white'
            }}
          >
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                px: { xs: 2.5, md: 3 },
                py: 3,
                background: `
                  radial-gradient(circle at top left, rgba(34,197,94,0.26), transparent 28%),
                  linear-gradient(135deg, #0f172a 0%, #14532d 100%)
                `
              }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.10em', color: '#86efac', textTransform: 'uppercase' }}>
                Reservation Request
              </Typography>
              <Typography sx={{ mt: 0.8, fontSize: { xs: '1.45rem', md: '1.75rem' }, fontWeight: 900, lineHeight: 1.1 }}>
                Create a new reservation
              </Typography>
              <Typography sx={{ mt: 0.8, color: 'rgba(255,255,255,0.72)', fontSize: '0.92rem', fontWeight: 500 }}>
                Fill out the details below so admin can review your request.
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2.5, md: 3 }, bgcolor: '#f8fafc' }}>
            <Grid container spacing={2.25} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={fieldSx}>
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
                <FormControl fullWidth sx={fieldSx}>
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
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => setFormData({ ...formData, startDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth sx={fieldSx} />}
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
                  renderInput={(params) => <TextField {...params} fullWidth sx={fieldSx} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => setFormData({ ...formData, endDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth sx={fieldSx} />}
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
                  renderInput={(params) => <TextField {...params} fullWidth sx={fieldSx} />}
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
                  sx={fieldSx}
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
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.25, bgcolor: '#f8fafc', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
            <Button
              onClick={handleCloseDialog}
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                color: themeColors.textSecondary,
                px: 2
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                fontWeight: 900,
                px: 2.4,
                bgcolor: themeColors.primary,
                boxShadow: '0 12px 22px rgba(22,101,52,0.18)',
                '&:hover': {
                  bgcolor: themeColors.primaryDark,
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Submit Request
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ borderRadius: '14px', boxShadow: '0 12px 32px rgba(15,23,42,0.16)' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default Reservations;
