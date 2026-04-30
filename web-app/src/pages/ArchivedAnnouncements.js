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
  Campaign as CampaignIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ArchivedAnnouncements = () => {
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
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreDialog, setRestoreDialog] = useState({ open: false, announcement: null });
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedAnnouncements();
  }, []);

  const loadArchivedAnnouncements = async () => {
    try {
      const response = await axios.get('/api/announcements/archived');
      if (response.data?.success) {
        setAnnouncements(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load archived announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.announcement) return;

    setRestoring(true);
    try {
      const response = await axios.put(`/api/announcements/${restoreDialog.announcement._id}/restore`);
      if (response.data?.success) {
        toast.success('Announcement restored successfully');
        setAnnouncements(announcements.filter(a => a._id !== restoreDialog.announcement._id));
        setRestoreDialog({ open: false, announcement: null });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to restore announcement');
    } finally {
      setRestoring(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return themeColors.success;
      case 'scheduled': return themeColors.warning;
      case 'draft': return themeColors.textSecondary;
      default: return themeColors.textSecondary;
    }
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.body.toLowerCase().includes(searchTerm.toLowerCase())
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
          onClick={() => navigate('/admin/announcements')}
          sx={{ mb: 2 }}
        >
          ← Back to Announcements
        </Button>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
          Archived Announcements
        </Typography>
        <Typography variant="body1" sx={{ color: themeColors.textSecondary, mb: 3 }}>
          Manage archived announcements. You can restore announcements to make them visible again.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}` }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search archived announcements..."
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

          {filteredAnnouncements.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              {announcements.length === 0 ? 'No archived announcements found.' : 'No announcements match your search.'}
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: '12px', border: `1px solid ${themeColors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: themeColors.cardBackground }}>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Author</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Archived Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAnnouncements.map((announcement) => (
                    <TableRow key={announcement._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CampaignIcon sx={{ color: themeColors.primary }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {announcement.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                              {announcement.body.substring(0, 50)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={announcement.status}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(announcement.status) + '20',
                            color: getStatusColor(announcement.status),
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {announcement.createdBy ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, color: themeColors.textSecondary }} />
                            <Typography variant="body2">
                              {announcement.createdBy.firstName} {announcement.createdBy.lastName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                            System
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {announcement.archivedAt ? new Date(announcement.archivedAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          {announcement.archivedReason || 'No reason provided'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Restore Announcement">
                          <IconButton
                            color="primary"
                            onClick={() => setRestoreDialog({ open: true, announcement })}
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
        onClose={() => setRestoreDialog({ open: false, announcement: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Restore Announcement</DialogTitle>
        <DialogContent>
          {restoreDialog.announcement && (
            <Typography>
              Are you sure you want to restore the announcement "<strong>{restoreDialog.announcement.title}</strong>"?
              This will make the announcement visible again.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, announcement: null })}>
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

export default ArchivedAnnouncements;