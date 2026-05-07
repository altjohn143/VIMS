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
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ArchivedUsers = () => {
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreDialog, setRestoreDialog] = useState({ open: false, user: null });
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedUsers();
  }, []);

  const loadArchivedUsers = async () => {
    try {
      const response = await axios.get('/api/users/archived');
      if (response.data?.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load archived users');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.user) return;

    setRestoring(true);
    try {
      const response = await axios.put(`/api/users/${restoreDialog.user._id}/restore`);
      if (response.data?.success) {
        toast.success('User restored successfully');
        setUsers(users.filter(u => u._id !== restoreDialog.user._id));
        setRestoreDialog({ open: false, user: null });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to restore user');
    } finally {
      setRestoring(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminIcon />;
      case 'security': return <SecurityIcon />;
      case 'resident': return <HomeIcon />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return themeColors.error;
      case 'security': return themeColors.warning;
      case 'resident': return themeColors.primary;
      default: return themeColors.textSecondary;
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
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
          onClick={() => navigate('/dashboard/admin/users')}
          sx={{ mb: 2 }}
        >
          ← Back to User Management
        </Button>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
          Archived Users
        </Typography>
        <Typography variant="body1" sx={{ color: themeColors.textSecondary, mb: 3 }}>
          Manage archived users. You can restore users to make them active again.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}` }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search archived users..."
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

          {filteredUsers.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              {users.length === 0 ? 'No archived users found.' : 'No users match your search.'}
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: '12px', border: `1px solid ${themeColors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: themeColors.cardBackground }}>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>House</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Archived Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: getRoleColor(user.role) + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getRoleIcon(user.role)}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          sx={{
                            bgcolor: getRoleColor(user.role) + '20',
                            color: getRoleColor(user.role),
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell>{user.houseNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {user.archivedAt ? new Date(user.archivedAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          {user.archivedReason || 'No reason provided'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Restore User">
                          <IconButton
                            color="primary"
                            onClick={() => setRestoreDialog({ open: true, user })}
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
        onClose={() => setRestoreDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Restore User</DialogTitle>
        <DialogContent>
          {restoreDialog.user && (
            <Typography>
              Are you sure you want to restore <strong>{restoreDialog.user.firstName} {restoreDialog.user.lastName}</strong>?
              This will make the user active again and they will be able to access the system.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, user: null })}>
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

export default ArchivedUsers;