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
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const EMPTY = { name: '', reportType: 'service_requests', recipients: '', enabled: true };

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

  const load = async () => {
    const res = await axios.get('/api/report-schedules');
    if (res.data.success) setRows(res.data.data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = { ...form, recipients: form.recipients.split(',').map((s) => s.trim()).filter(Boolean) };
    await axios.post('/api/report-schedules', payload);
    toast.success('Schedule created');
    setOpen(false);
    setForm(EMPTY);
    load();
  };

  const runNow = async (id) => {
    await axios.post(`/api/report-schedules/${id}/run-now`);
    toast.success('Report sent');
    load();
  };

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
            Scheduled Report Delivery
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Automate recurring report sharing to your recipients.
          </Typography>
          <Chip
            label={`${rows.length} active schedules`}
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
          New Schedule
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
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recipients</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Run</TableCell>
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
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.reportType}</TableCell>
                  <TableCell>{(r.recipients || []).join(', ')}</TableCell>
                  <TableCell>{r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => runNow(r._id)}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      Run Now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle>Create Schedule</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth margin="normal" select label="Report Type" value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })}>
            <MenuItem value="service_requests">Service Requests</MenuItem>
            <MenuItem value="visitors">Visitors</MenuItem>
            <MenuItem value="payments">Payments</MenuItem>
          </TextField>
          <TextField fullWidth margin="normal" label="Recipients (comma separated emails)" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button onClick={save} variant="contained" sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReportSchedules;
