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
import { ArrowBack as ArrowBackIcon, Shield as ShieldIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const initialForm = { area: '', checkpoint: '', notes: '', status: 'completed' };

const SecurityPatrolSchedule = () => {
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
      const res = await axios.get('/api/patrols');
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load patrol logs');
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

  const submit = async () => {
    if (!form.area || !form.checkpoint) {
      toast.error('Area and checkpoint are required');
      return;
    }
    try {
      await axios.post('/api/patrols/log', form);
      toast.success('Patrol log submitted');
      setForm(initialForm);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save patrol log');
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
            Patrol Schedule
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
            <ShieldIcon sx={{ color: '#bef264' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Patrol Logs
            </Typography>
          </Box>
          <Typography sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Record officer patrol checkpoints and monitor outcomes.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, mb: 2, borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)' }}>
          <Stack spacing={2}>
            <TextField select label="Area" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value, checkpoint: '' }))}>
              <MenuItem value="">Select area</MenuItem>
              {Array.from(new Set(lots.map((lot) => `Phase ${lot.phase}`))).map((area) => (
                <MenuItem key={area} value={area}>{area}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Checkpoint"
              value={form.checkpoint}
              onChange={(e) => setForm((p) => ({ ...p, checkpoint: e.target.value }))}
              disabled={!form.area}
            >
              <MenuItem value="">Select checkpoint</MenuItem>
              {lots
                .filter((lot) => `Phase ${lot.phase}` === form.area)
                .map((lot) => (
                  <MenuItem key={lot.lotId} value={lot.lotId}>
                    {`Block ${lot.block} - Lot ${lot.lotNumber}`}
                  </MenuItem>
                ))}
            </TextField>
            <TextField label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} multiline minRows={3} />
            <TextField select label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="issue_found">Issue Found</MenuItem>
            </TextField>
            <Box>
              <Button
                variant="contained"
                onClick={submit}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}
              >
                Submit Patrol Log
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {rows.map((item) => (
            <Paper key={item._id} sx={{ p: 2.2, borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary }}>{item.area} - {item.checkpoint}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.notes || 'No notes'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Officer: {item.officerId?.firstName || ''} {item.officerId?.lastName || ''} | {new Date(item.loggedAt || item.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Chip size="small" label={item.status} color={item.status === 'issue_found' ? 'warning' : 'success'} />
              </Box>
            </Paper>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};

export default SecurityPatrolSchedule;
