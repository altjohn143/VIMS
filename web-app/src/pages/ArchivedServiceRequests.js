import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Restore as RestoreIcon,
  Build as BuildIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ArchivedServiceRequests = () => {
  const navigate = useNavigate();

  const themeColors = {
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    background: '#f3f5f7',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  };
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreDialog, setRestoreDialog] = useState({ open: false, serviceRequest: null });
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedServiceRequests();
  }, []);

  const loadArchivedServiceRequests = async () => {
    try {
      const response = await axios.get('/api/service-requests/archived');
      if (response.data?.success) {
        setServiceRequests(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load archived service requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.serviceRequest) return;

    setRestoring(true);
    try {
      const response = await axios.put(`/api/service-requests/${restoreDialog.serviceRequest._id}/restore`);
      if (response.data?.success) {
        toast.success('Service request restored successfully');
        setServiceRequests(serviceRequests.filter(sr => sr._id !== restoreDialog.serviceRequest._id));
        setRestoreDialog({ open: false, serviceRequest: null });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to restore service request');
    } finally {
      setRestoring(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return themeColors.success;
      case 'in-progress': return themeColors.primary;
      case 'assigned': return themeColors.warning;
      case 'pending': return themeColors.textSecondary;
      case 'cancelled': return themeColors.error;
      case 'rejected': return themeColors.error;
      default: return themeColors.textSecondary;
    }
  };

  const filteredServiceRequests = serviceRequests.filter(serviceRequest =>
    serviceRequest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serviceRequest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (serviceRequest.createdBy && `${serviceRequest.createdBy.firstName} ${serviceRequest.createdBy.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/service-requests')}
          sx={{ mb: 2 }}
        >
          ← Back to Service Requests
        </Button>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
          Archived Service Requests
        </Typography>
        <Typography variant="body1" sx={{ color: themeColors.textSecondary, mb: 3 }}>
          Manage archived service requests. You can restore requests to make them active again.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}` }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search archived service requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
          </Box>

          {filteredServiceRequests.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              {serviceRequests.length === 0 ? 'No archived service requests found.' : 'No service requests match your search.'}
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: '12px', border: `1px solid ${themeColors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: themeColors.cardBackground }}>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Requester</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Archived Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredServiceRequests.map((serviceRequest) => (
                    <TableRow key={serviceRequest._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BuildIcon sx={{ color: themeColors.primary }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {serviceRequest.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                              {serviceRequest.description.substring(0, 50)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={serviceRequest.status.replace('-', ' ')}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(serviceRequest.status) + '20',
                            color: getStatusColor(serviceRequest.status),
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {serviceRequest.createdBy ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, color: themeColors.textSecondary }} />
                            <Typography variant="body2">
                              {serviceRequest.createdBy.firstName} {serviceRequest.createdBy.lastName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                            Unknown
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={serviceRequest.priority}
                          size="small"
                          sx={{
                            bgcolor: serviceRequest.priority === 'high' ? themeColors.error + '20' :
                                   serviceRequest.priority === 'medium' ? themeColors.warning + '20' :
                                   themeColors.success + '20',
                            color: serviceRequest.priority === 'high' ? themeColors.error :
                                  serviceRequest.priority === 'medium' ? themeColors.warning :
                                  themeColors.success,
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {serviceRequest.archivedAt ? new Date(serviceRequest.archivedAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          {serviceRequest.archivedReason || 'No reason provided'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Restore Service Request">
                          <IconButton
                            color="primary"
                            onClick={() => setRestoreDialog({ open: true, serviceRequest })}
                            sx={{ '&:hover': { bgcolor: themeColors.primary + '10' } }}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={restoreDialog.open}
        onClose={() => setRestoreDialog({ open: false, serviceRequest: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Restore Service Request</DialogTitle>
        <DialogContent>
          {restoreDialog.serviceRequest && (
            <Typography>
              Are you sure you want to restore the service request "<strong>{restoreDialog.serviceRequest.title}</strong>"?
              This will make the service request active again.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, serviceRequest: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            variant="contained"
            disabled={restoring}
            startIcon={restoring ? <CircularProgress size={16} /> : <RestoreIcon />}
          >
            {restoring ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ArchivedServiceRequests;