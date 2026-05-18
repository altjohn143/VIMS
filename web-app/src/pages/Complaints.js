import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  AddComment as AddCommentIcon,
  Archive as ArchiveIcon,
  Assignment as AssignmentIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  ErrorOutline as ErrorOutlineIcon,
  LocationOn as LocationIcon,
  Send as SendIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const issueTypes = [
  'Noise complaint',
  'Neighbor concern',
  'Sanitation concern',
  'Road or common area issue',
  'Policy violation',
  'Other complaint'
];

const statusLabels = {
  pending: { label: 'Pending', color: themeColors.warning },
  'under-review': { label: 'Under Review', color: themeColors.info },
  assigned: { label: 'Assigned', color: themeColors.info },
  'in-progress': { label: 'In Progress', color: themeColors.primary },
  completed: { label: 'Resolved', color: themeColors.success },
  cancelled: { label: 'Cancelled', color: themeColors.textSecondary },
  rejected: { label: 'Rejected', color: themeColors.error }
};

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'urgent', label: 'Urgent' }
];

const Complaints = () => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const defaultLocation = user?.houseNumber || `${user?.firstName || 'Resident'} ${user?.lastName || ''}`.trim();

  const [complaints, setComplaints] = useState([]);
  const [archivedComplaints, setArchivedComplaints] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingComplaintId, setEditingComplaintId] = useState(null);
  const [formData, setFormData] = useState({
    issueType: '',
    title: '',
    description: '',
    priority: 'medium',
    location: defaultLocation
  });

  const fetchComplaints = useCallback(async () => {
    try {
      setFetching(true);
      const [activeResponse, archivedResponse] = await Promise.all([
        axios.get('/api/service-requests/my'),
        axios.get('/api/service-requests/my/archived', { params: { category: 'complaint' } })
      ]);
      const rows = activeResponse.data?.data || [];
      setComplaints(rows.filter((request) => request.category === 'complaint'));
      setArchivedComplaints(archivedResponse.data?.data || []);
    } catch (error) {
      toast.error('Failed to load complaints');
      setComplaints([]);
      setArchivedComplaints([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      location: prev.location || defaultLocation
    }));
  }, [defaultLocation]);

  const complaintStats = useMemo(() => {
    const active = complaints.filter((item) => !['completed', 'cancelled', 'rejected'].includes(item.status)).length;
    const resolved = complaints.filter((item) => item.status === 'completed').length;
    return { total: complaints.length + archivedComplaints.length, active, resolved, archived: archivedComplaints.length };
  }, [complaints, archivedComplaints]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = useCallback(() => {
    setEditingComplaintId(null);
    setFormData({
      issueType: '',
      title: '',
      description: '',
      priority: 'medium',
      location: defaultLocation
    });
  }, [defaultLocation]);

  const buildComplaintDescription = (issueType, description) => `Type: ${issueType}\n\n${description}`;

  const parseComplaintDescription = (description = '') => {
    const match = description.match(/^Type:\s*(.+?)\n\n([\s\S]*)$/);
    if (!match) return { issueType: 'Other complaint', details: description };
    return { issueType: match[1], details: match[2] };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.issueType || !formData.title || !formData.description) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: 'complaint',
        title: formData.title,
        description: buildComplaintDescription(formData.issueType, formData.description),
        priority: formData.priority,
        location: formData.location || defaultLocation
      };

      const response = editingComplaintId
        ? await axios.put(`/api/service-requests/${editingComplaintId}`, payload)
        : await axios.post('/api/service-requests', payload);
      if (response.data?.success || response.status === 201) {
        toast.success(editingComplaintId ? 'Complaint updated successfully' : 'Complaint submitted successfully');
        resetForm();
        fetchComplaints();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComplaint = (complaint) => {
    const parsed = parseComplaintDescription(complaint.description);
    setEditingComplaintId(complaint._id);
    setFormData({
      issueType: issueTypes.includes(parsed.issueType) ? parsed.issueType : 'Other complaint',
      title: complaint.title || '',
      description: parsed.details || '',
      priority: complaint.priority || 'medium',
      location: complaint.location || defaultLocation
    });
  };

  const handleCancelComplaint = async (complaintId) => {
    if (!window.confirm('Are you sure you want to cancel this complaint?')) return;

    try {
      await axios.put(`/api/service-requests/${complaintId}/status`, {
        status: 'cancelled',
        cancelledReason: 'Cancelled by resident'
      });
      toast.success('Complaint cancelled successfully');
      if (editingComplaintId === complaintId) resetForm();
      fetchComplaints();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel complaint');
    }
  };

  const handleArchiveComplaint = async (complaintId) => {
    if (!window.confirm('Archive this complaint? It will move to Archived Complaints.')) return;

    try {
      await axios.put(`/api/service-requests/${complaintId}/archive`, {
        reason: 'Archived by resident'
      });
      toast.success('Complaint archived');
      if (editingComplaintId === complaintId) resetForm();
      fetchComplaints();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to archive complaint');
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusChip = (status) => {
    const meta = statusLabels[status] || { label: status || 'Unknown', color: themeColors.textSecondary };
    return (
      <Chip
        label={meta.label}
        size="small"
        sx={{
          bgcolor: `${meta.color}18`,
          color: meta.color,
          fontWeight: 800,
          borderRadius: '999px'
        }}
      />
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.textPrimary, mb: 0.75 }}>
          Complaints Form
        </Typography>
        <Typography sx={{ color: themeColors.textSecondary }}>
          Submit community concerns for admin review and track their progress.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {[
          { label: 'Total Complaints', value: complaintStats.total, icon: <AssignmentIcon /> },
          { label: 'Active Complaints', value: complaintStats.active, icon: <ErrorOutlineIcon /> },
          { label: 'Resolved Complaints', value: complaintStats.resolved, icon: <AddCommentIcon /> },
          { label: 'Archived Complaints', value: complaintStats.archived, icon: <ArchiveIcon /> }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: `1px solid ${themeColors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box sx={{ color: themeColors.primary, display: 'flex' }}>{stat.icon}</Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: themeColors.textPrimary }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${themeColors.border}`,
              bgcolor: themeColors.cardBackground
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
              <AddCommentIcon sx={{ color: themeColors.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                {editingComplaintId ? 'Edit Complaint' : 'New Complaint'}
              </Typography>
            </Stack>

            <Box component="form" onSubmit={handleSubmit}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel required>Complaint Type</InputLabel>
                <Select name="issueType" value={formData.issueType} label="Complaint Type" onChange={handleChange} required>
                  {issueTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                name="title"
                label="Subject"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                required
                sx={{ mb: 2 }}
              />

              <TextField
                name="description"
                label="Complaint Details"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                minRows={5}
                required
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Priority</InputLabel>
                <Select name="priority" value={formData.priority} label="Priority" onChange={handleChange}>
                  {priorityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                name="location"
                label="Location"
                value={formData.location}
                onChange={handleChange}
                fullWidth
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <LocationIcon sx={{ color: themeColors.textSecondary, mr: 1 }} />
                }}
              />

              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                Your complaint will be sent to the admin queue for review.
              </Alert>

              <Button
                type="submit"
                variant="contained"
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                disabled={submitting}
                fullWidth
                sx={{
                  py: 1.2,
                  bgcolor: themeColors.primary,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 800,
                  '&:hover': { bgcolor: themeColors.primaryDark }
                }}
              >
                {submitting ? 'Saving...' : editingComplaintId ? 'Update Complaint' : 'Submit Complaint'}
              </Button>

              {editingComplaintId && (
                <Button
                  onClick={resetForm}
                  fullWidth
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 800,
                    color: themeColors.textSecondary
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${themeColors.border}`,
              bgcolor: themeColors.cardBackground,
              minHeight: 420
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.textPrimary, mb: 2 }}>
              My Complaints
            </Typography>

            {fetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: themeColors.primary }} />
              </Box>
            ) : complaints.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <ErrorOutlineIcon sx={{ fontSize: 44, color: themeColors.textSecondary, mb: 1 }} />
                <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>No complaints submitted</Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Submitted complaints will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {complaints.map((complaint) => (
                  <Card key={complaint._id} elevation={0} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                            {complaint.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: themeColors.textSecondary, mt: 0.5 }}>
                            {complaint.location || 'No location'} - Submitted {formatDate(complaint.createdAt)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getStatusChip(complaint.status)}
                          <Chip label={complaint.priority || 'medium'} size="small" sx={{ textTransform: 'capitalize', borderRadius: '999px' }} />
                        </Stack>
                      </Stack>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="body2" sx={{ color: themeColors.textSecondary, whiteSpace: 'pre-line' }}>
                        {complaint.description}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                        {complaint.status === 'pending' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditComplaint(complaint)}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                          >
                            Edit
                          </Button>
                        )}
                        {['pending', 'under-review', 'assigned', 'in-progress'].includes(complaint.status) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleCancelComplaint(complaint._id)}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                          >
                            Cancel
                          </Button>
                        )}
                        {['completed', 'cancelled', 'rejected'].includes(complaint.status) && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ArchiveIcon />}
                            onClick={() => handleArchiveComplaint(complaint._id)}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 800,
                              bgcolor: themeColors.primary,
                              '&:hover': { bgcolor: themeColors.primaryDark }
                            }}
                          >
                            Archive
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          borderRadius: 2,
          border: `1px solid ${themeColors.border}`,
          bgcolor: themeColors.cardBackground
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
          <ArchiveIcon sx={{ color: themeColors.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
            Archived Complaints
          </Typography>
        </Stack>

        {fetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: themeColors.primary }} />
          </Box>
        ) : archivedComplaints.length === 0 ? (
          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
            Archived complaints will be stored here.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {archivedComplaints.map((complaint) => (
              <Grid item xs={12} md={6} key={complaint._id}>
                <Card elevation={0} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                          {complaint.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary, mt: 0.5 }}>
                          Archived {formatDate(complaint.archivedAt)} - Submitted {formatDate(complaint.createdAt)}
                        </Typography>
                      </Box>
                      {getStatusChip(complaint.status)}
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, whiteSpace: 'pre-line' }}>
                      {complaint.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default Complaints;
