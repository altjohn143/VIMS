import React, { useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  MenuItem,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AdminPanelSettings as AdminIcon,
  ScheduleSend as ScheduleSendIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

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

const EMPTY = {
  resourceType: 'venue',
  resourceName: 'Covered Court',
  description: '',
  startDate: '',
  endDate: '',
  quantity: 1,
  status: 'pending',
  notes: '',
};

const themeColors = {
  primary: '#166534',
  primaryLight: '#22c55e',
  primaryDark: '#14532d',
  background: '#f3f5f7',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const AdminReportSchedules = () => {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await axios.get('/api/reservations');
    if (res.data.success) setRows(res.data.data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.resourceName || !form.startDate || !form.endDate) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/reservations', form);
      toast.success('Reservation created');
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`/api/reservations/${id}`, { status });
      toast.success(`Reservation ${status}`);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update reservation');
    }
  };

  const deleteReservation = async (id) => {
    try {
      await axios.delete(`/api/reservations/${id}`);
      toast.success('Reservation deleted');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete reservation');
    }
  };

  const resourceOptions = form.resourceType === 'venue' ? VENUES : EQUIPMENT;

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
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      <AppBar
        position="sticky"
        sx={{
          bgcolor: 'rgba(255,255,255,0.92)',
          color: themeColors.textPrimary,
          backdropFilter: 'blur(14px)',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.06)',
          borderBottom: `1px solid ${themeColors.border}`
        }}
      >
        <Toolbar>
          <IconButton
            component={RouterLink}
            to="/admin/reports"
            sx={{
              mr: 2,
              color: themeColors.primary,
              borderRadius: 2.5,
              bgcolor: 'rgba(34, 197, 94, 0.14)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <AdminIcon sx={{ mr: 1.5, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Report Schedules
          </Typography>
          <Avatar sx={{ width: 36, height: 36, bgcolor: themeColors.primary }}>
            <ScheduleSendIcon sx={{ fontSize: 20 }} />
          </Avatar>
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
            animation: 'fadeUpSoft .45s ease-out'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Venue & Equipment Reservations
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Manage reservations for covered courts, pools, halls, and shared event equipment.
          </Typography>
          <Chip
            label={`${rows.length} active reservations`}
            size="small"
            sx={{
              mt: 1.5,
              bgcolor: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontWeight: 700
            }}
          />
        </Paper>

        <Button
          variant="contained"
          onClick={() => setOpen(true)}
          startIcon={<ScheduleSendIcon />}
          sx={{
            mb: 2,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: themeColors.primary,
            '&:hover': { bgcolor: themeColors.primaryDark }
          }}
        >
          New Reservation
        </Button>

        <Paper
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Start</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>End</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reserved By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r._id}
                  hover
                  sx={{ '&:hover': { backgroundColor: 'rgba(22, 163, 74, 0.04)' } }}
                >
                  <TableCell>{r.resourceName}</TableCell>
                  <TableCell>{r.resourceType === 'venue' ? 'Venue' : 'Equipment'}</TableCell>
                  <TableCell>{new Date(r.startDate).toLocaleString()}</TableCell>
                  <TableCell>{new Date(r.endDate).toLocaleString()}</TableCell>
                  <TableCell>{r.quantity || 1}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.reservedBy ? `${r.reservedBy.firstName} ${r.reservedBy.lastName}` : 'Admin'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant={r.status === 'confirmed' ? 'outlined' : 'contained'}
                        color={r.status === 'confirmed' ? 'warning' : 'success'}
                        onClick={() => updateStatus(r._id, r.status === 'confirmed' ? 'cancelled' : 'confirmed')}
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        {r.status === 'confirmed' ? 'Cancel' : 'Confirm'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => deleteReservation(r._id)}
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle>Create Reservation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            select
            label="Resource Type"
            value={form.resourceType}
            onChange={(e) => setForm({
              ...form,
              resourceType: e.target.value,
              resourceName: e.target.value === 'venue' ? VENUES[0] : EQUIPMENT[0],
            })}
          >
            <MenuItem value="venue">Venue</MenuItem>
            <MenuItem value="equipment">Equipment</MenuItem>
          </TextField>

          <TextField
            fullWidth
            margin="normal"
            select
            label="Resource Name"
            value={form.resourceName}
            onChange={(e) => setForm({ ...form, resourceName: e.target.value })}
          >
            {resourceOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            margin="normal"
            label="Start Date & Time"
            type="datetime-local"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="End Date & Time"
            type="datetime-local"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            inputProps={{ min: 1 }}
          />
          <TextField
            fullWidth
            margin="normal"
            select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            fullWidth
            margin="normal"
            label="Additional Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button
            onClick={save}
            variant="contained"
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Reservation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReportSchedules;
