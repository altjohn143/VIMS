import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Chip,
  TableContainer,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ScheduleSend as ScheduleSendIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const themeColors = {
  primary: '#166534',
  primaryLight: '#22c55e',
  primaryDark: '#14532d',
  background: '#f3f5f7',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)',
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Reserved';
    case 'borrowed':
      return 'Borrowed';
    case 'returned':
      return 'Returned';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

const getStatusColors = (status) => {
  switch (status) {
    case 'returned':
      return { bg: '#d1fae5', color: '#166534' };
    case 'borrowed':
      return { bg: '#fde68a', color: '#92400e' };
    case 'confirmed':
      return { bg: '#bfdbfe', color: '#1d4ed8' };
    case 'pending':
      return { bg: '#fef3c7', color: '#92400e' };
    case 'cancelled':
      return { bg: '#fee2e2', color: '#991b1b' };
    default:
      return { bg: '#e2e8f0', color: '#0f172a' };
  }
};

const AdminReportSchedules = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [returnCondition, setReturnCondition] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reservations');
      if (res.data.success) {
        setRows(res.data.data || []);
      } else {
        toast.error(res.data?.error || 'Failed to load reservation logs');
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load reservation logs');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markCheckedOut = async (reservationId) => {
    setProcessing(true);
    try {
      await axios.put(`/api/reservations/${reservationId}`, {
        actualCheckout: new Date().toISOString(),
        status: 'borrowed',
      });
      toast.success('Equipment checked out');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to check out equipment');
      setProcessing(false);
    }
  };

  const markReturned = async (reservationId) => {
    setProcessing(true);
    try {
      await axios.put(`/api/reservations/${reservationId}`, {
        actualReturn: new Date().toISOString(),
        status: 'returned',
      });
      toast.success('Equipment returned');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to return equipment');
      setProcessing(false);
    }
  };

  const saveIssue = async () => {
    if (!selectedReservation) return;
    setProcessing(true);
    try {
      await axios.put(`/api/reservations/${selectedReservation._id}`, {
        returnCondition,
        issueNotes,
      });
      toast.success('Issue logged');
      setSelectedReservation(null);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save issue');
      setProcessing(false);
    }
  };

  const cancelReservation = async (reservationId) => {
    setProcessing(true);
    try {
      await axios.put(`/api/reservations/${reservationId}`, { status: 'cancelled' });
      toast.success('Reservation cancelled');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to cancel reservation');
      setProcessing(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: rows.length,
      reserved: rows.filter((item) => item.resourceType === 'venue' && ['pending', 'confirmed'].includes(item.status)).length,
      borrowed: rows.filter((item) => item.status === 'borrowed').length,
      returned: rows.filter((item) => item.status === 'returned').length,
      issues: rows.filter((item) => item.issueNotes || item.returnCondition).length,
    }),
    [rows]
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `,
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <AppBar
        position="sticky"
        sx={{
          bgcolor: 'rgba(255,255,255,0.92)',
          color: themeColors.textPrimary,
          backdropFilter: 'blur(14px)',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.06)',
          borderBottom: `1px solid ${themeColors.border}`,
        }}
      >
        <Toolbar>
          <IconButton
            component={RouterLink}
            to="/dashboard/admin/reports"
            sx={{
              mr: 2,
              color: themeColors.primary,
              borderRadius: 2.5,
              bgcolor: 'rgba(34, 197, 94, 0.14)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ mr: 1.5, bgcolor: themeColors.primary }}>
            <ScheduleSendIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Reservation Logs
          </Typography>
          <Button
            variant="contained"
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: themeColors.primary,
              '&:hover': { bgcolor: themeColors.primaryDark },
            }}
            onClick={load}
            disabled={loading}
          >
            Refresh Logs
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)',
            animation: 'fadeUpSoft .45s ease-out',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Reservation Logs
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Review venue reservations and equipment borrow/return history with issue tracking.
          </Typography>
          <Chip
            label={`${stats.total} log entries`}
            size="small"
            sx={{
              mt: 1.5,
              bgcolor: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontWeight: 700,
            }}
          />
        </Paper>

        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: '20px',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            border: `1px solid ${themeColors.border}`,
            backgroundColor: '#fff',
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {[
              { label: 'Total Logs', value: stats.total, color: '#2563eb' },
              { label: 'Reserved', value: stats.reserved, color: '#16a34a' },
              { label: 'Borrowed', value: stats.borrowed, color: '#f59e0b' },
              { label: 'Returned', value: stats.returned, color: '#0ea5e9' },
              { label: 'Issues', value: stats.issues, color: '#dc2626' },
            ].map((stat) => (
              <Paper
                key={stat.label}
                sx={{
                  flex: '1 1 180px',
                  p: 2,
                  borderRadius: '18px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: '#f8fafc',
                }}
              >
                <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 0.5 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color }}>
                  {stat.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Typography variant="caption" color={themeColors.textSecondary}>
            This screen is now focused on logs. Use the table below to track reservation time windows, equipment checkout/checkin, and returned issue notes.
          </Typography>
        </Paper>

        <Paper
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Resident</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reserved From</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reserved To</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Check Out</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Return Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover sx={{ '&:hover': { backgroundColor: 'rgba(22, 163, 74, 0.04)' } }}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: themeColors.textSecondary }}>
                        #{r._id ? r._id.toString().slice(-6) : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.resourceName}</TableCell>
                    <TableCell>{r.resourceType === 'venue' ? 'Venue' : 'Equipment'}</TableCell>
                    <TableCell>{r.reservedBy ? `${r.reservedBy.firstName} ${r.reservedBy.lastName}` : 'Admin'}</TableCell>
                    <TableCell>{r.startDate ? new Date(r.startDate).toLocaleString() : '—'}</TableCell>
                    <TableCell>{r.endDate ? new Date(r.endDate).toLocaleString() : '—'}</TableCell>
                    <TableCell>{r.actualCheckout ? new Date(r.actualCheckout).toLocaleString() : '—'}</TableCell>
                    <TableCell>{r.actualReturn ? new Date(r.actualReturn).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(r.status)}
                        size="small"
                        sx={{
                          bgcolor: getStatusColors(r.status).bg,
                          color: getStatusColors(r.status).color,
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {r.issueNotes || r.returnCondition ? (
                        <Box>
                          {r.returnCondition && (
                            <Typography variant="caption" display="block">
                              Condition: {r.returnCondition}
                            </Typography>
                          )}
                          {r.issueNotes && (
                            <Typography variant="caption" display="block">
                              Issue: {r.issueNotes}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color={themeColors.textSecondary}>
                          No issues
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {r.resourceType === 'equipment' && !r.actualCheckout && (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{
                              textTransform: 'none',
                              borderRadius: 2.5,
                              bgcolor: themeColors.primary,
                              '&:hover': { bgcolor: themeColors.primaryDark },
                            }}
                            onClick={() => markCheckedOut(r._id)}
                            disabled={processing}
                          >
                            Check Out
                          </Button>
                        )}
                        {r.resourceType === 'equipment' && r.actualCheckout && !r.actualReturn && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            sx={{ textTransform: 'none', borderRadius: 2.5 }}
                            onClick={() => markReturned(r._id)}
                            disabled={processing}
                          >
                            Return
                          </Button>
                        )}
                        {r.resourceType === 'equipment' && r.actualReturn && (
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{
                              textTransform: 'none',
                              borderRadius: 2.5,
                              color: themeColors.primary,
                              borderColor: themeColors.primary,
                            }}
                            onClick={() => {
                              setSelectedReservation(r);
                              setReturnCondition(r.returnCondition || '');
                              setIssueNotes(r.issueNotes || '');
                            }}
                          >
                            Report Issue
                          </Button>
                        )}
                        {['pending', 'confirmed'].includes(r.status) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            sx={{ textTransform: 'none', borderRadius: 2.5 }}
                            onClick={() => cancelReservation(r._id)}
                            disabled={processing}
                          >
                            Cancel
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog
          open={Boolean(selectedReservation)}
          onClose={() => setSelectedReservation(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Report Equipment Return Issue</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Return Condition"
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Issue Notes"
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              multiline
              rows={4}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSelectedReservation(null)}
              sx={{ textTransform: 'none', borderRadius: 2.5 }}
            >
              Close
            </Button>
            <Button
              onClick={saveIssue}
              variant="contained"
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                bgcolor: themeColors.primary,
                '&:hover': { bgcolor: themeColors.primaryDark },
              }}
              disabled={processing}
            >
              Save Issue
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminReportSchedules;
