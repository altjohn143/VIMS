import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Security as SecurityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const initialForm = {
  title: '',
  description: '',
  phase: '',
  block: '',
  lotNumber: '',
  severity: 'medium'
};

const SecurityIncidents = () => {
  const themeColors = {
    primary: '#166534',
    primaryDark: '#14532d',
    primaryLight: '#22c55e',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

  const [rows, setRows] = useState([]);
  const [lots, setLots] = useState([]);
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/incidents');
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load incidents');
    }
  }, []);

  const loadLots = useCallback(async () => {
    try {
      const res = await axios.get('/api/lots');
      if (res.data?.success) setLots(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load village map data');
    }
  }, []);

  useEffect(() => {
    load();
    loadLots();
  }, [load, loadLots]);

  const createIncident = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (!form.phase || !form.block || !form.lotNumber) {
      toast.error('Location selection is required');
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      severity: form.severity,
      location: `Phase ${form.phase} - Block ${form.block} - Lot ${form.lotNumber}`
    };

    try {
      await axios.post('/api/incidents', payload);
      toast.success('Incident reported');
      setForm(initialForm);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to report incident');
    }
  };

  const setStatus = async (id, status) => {
    try {
      await axios.put(`/api/incidents/${id}/status`, { status });
      toast.success(`Incident marked as ${status}`);
      load();
    } catch (error) {
      toast.error('Failed to update incident status');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `
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
            edge="start"
            onClick={() => navigate('/dashboard')}
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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Security Incidents
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <SecurityIcon sx={{ color: '#bef264' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Incident Reports
            </Typography>
          </Box>
          <Typography sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Track and manage security-related reports from the community.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, mb: 2, borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)' }}>
          <Stack spacing={2}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <TextField label="Description" value={form.description} multiline minRows={3} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <TextField select label="Phase" value={form.phase} onChange={(e) => setForm((p) => ({ ...p, phase: e.target.value, block: '', lotNumber: '' }))}>
              <MenuItem value="">Select phase</MenuItem>
              {Array.from(new Set(lots.map((lot) => lot.phase))).sort((a, b) => a - b).map((phase) => (
                <MenuItem key={phase} value={String(phase)}>{`Phase ${phase}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Block"
              value={form.block}
              disabled={!form.phase}
              onChange={(e) => setForm((p) => ({ ...p, block: e.target.value, lotNumber: '' }))}
            >
              <MenuItem value="">Select block</MenuItem>
              {Array.from(new Set(lots.filter((lot) => String(lot.phase) === form.phase).map((lot) => lot.block))).sort((a, b) => a - b).map((block) => (
                <MenuItem key={block} value={String(block)}>{`Block ${block}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Lot"
              value={form.lotNumber}
              disabled={!form.phase || !form.block}
              onChange={(e) => setForm((p) => ({ ...p, lotNumber: e.target.value }))}
            >
              <MenuItem value="">Select lot</MenuItem>
              {lots
                .filter((lot) => String(lot.phase) === form.phase && String(lot.block) === form.block)
                .map((lot) => (
                  <MenuItem key={lot.lotId} value={String(lot.lotNumber)}>{`Lot ${lot.lotNumber}`}</MenuItem>
                ))}
            </TextField>
            <TextField select label="Severity" value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </TextField>
            <Box>
              <Button
                variant="contained"
                onClick={createIncident}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}
              >
                Submit Incident
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {rows.map((item) => (
            <Paper key={item._id} sx={{ p: 2.2, borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.location || 'No location'} | Reported by {item.reportedBy?.firstName || ''} {item.reportedBy?.lastName || ''} | {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={item.severity} color={item.severity === 'critical' ? 'error' : item.severity === 'high' ? 'warning' : 'default'} />
                  <Chip size="small" label={item.status} />
                  <Button size="small" onClick={() => setStatus(item._id, 'investigating')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                    Investigate
                  </Button>
                  <Button size="small" onClick={() => setStatus(item._id, 'resolved')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                    Resolve
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};

export default SecurityIncidents;
