import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
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

const initialForm = { phase: '', area: '', checkpoint: '', notes: '', status: 'completed' };

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
  const [assignment, setAssignment] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const navigate = useNavigate();

  const paginatedRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rows, rowsPerPage]
  );

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

  const loadAssignment = useCallback(async () => {
    try {
      const res = await axios.get('/api/patrols/my-assignment');
      if (res.data?.success) setAssignment(res.data.data || null);
    } catch (error) {
      toast.error('Failed to load patrol route assignment');
    }
  }, []);

  useEffect(() => {
    load();
    loadLots();
    loadAssignment();
  }, [load, loadLots, loadAssignment]);

  const assignedPhases = useMemo(() => assignment?.assignedPhases || [], [assignment?.assignedPhases]);
  const isHeadOfficer = assignment?.securityLevel === 'head-officer';
  const availableLots = useMemo(
    () => isHeadOfficer || assignedPhases.length === 0
      ? lots
      : lots.filter((lot) => assignedPhases.map(String).includes(String(lot.phase))),
    [assignedPhases, isHeadOfficer, lots]
  );
  const phases = useMemo(
    () => Array.from(new Set(availableLots.map((lot) => lot.phase))).sort((a, b) => a - b),
    [availableLots]
  );

  const formatList = (items, fallback) => {
    if (!Array.isArray(items) || items.length === 0) return fallback;
    return items.join(', ');
  };

  const submit = async () => {
    if (!form.phase || !form.area || !form.checkpoint) {
      toast.error('Phase, area and checkpoint are required');
      return;
    }
    try {
      await axios.post('/api/patrols/log', {
        ...form,
        phase: Number(form.phase)
      });
      toast.success('Patrol log submitted');
      setForm(initialForm);
      setPage(0);
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

      <Container maxWidth="xl" sx={{ py: 4 }}>
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

        <Grid container spacing={2.5} alignItems="flex-start">
          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>My Patrol Route</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isHeadOfficer ? 'Head officer coverage: may monitor and log all security patrol areas.' : 'Assigned route details from admin/head officer.'}
                  </Typography>
                </Box>
                <Chip
                  icon={<ShieldIcon />}
                  label={isHeadOfficer ? 'Head Officer Coverage' : 'Assigned Personnel Route'}
                  sx={{ bgcolor: 'rgba(22, 101, 52, 0.12)', color: themeColors.primary, fontWeight: 800 }}
                />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Phases</Typography>
                  <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                    {isHeadOfficer ? 'All phases' : formatList(assignedPhases.map((phase) => `Phase ${phase}`), 'No phase assigned')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Areas</Typography>
                  <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                    {isHeadOfficer ? 'All security areas' : formatList(assignment?.assignedAreas, 'No area assigned')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Timing / Schedule</Typography>
                  <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                    {isHeadOfficer ? 'Supervision as needed' : assignment?.patrolSchedule || 'No patrol schedule set'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2.5, borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)' }}>
              <Typography sx={{ mb: 2, fontWeight: 800, color: themeColors.textPrimary }}>Patrol Log Form</Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Phase"
                  value={form.phase}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    phase: e.target.value,
                    area: e.target.value ? `Phase ${e.target.value}` : '',
                    checkpoint: ''
                  }))}
                >
                  <MenuItem value="">Select phase</MenuItem>
                  {phases.map((phase) => (
                    <MenuItem key={phase} value={phase}>{`Phase ${phase}`}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Area" value={form.area} disabled helperText={form.phase ? `Patrol area set for Phase ${form.phase}` : 'Select a phase first'} />
                <TextField select label="Checkpoint" value={form.checkpoint} onChange={(e) => setForm((p) => ({ ...p, checkpoint: e.target.value }))} disabled={!form.phase}>
                  <MenuItem value="">Select checkpoint</MenuItem>
                  {availableLots.filter((lot) => String(lot.phase) === String(form.phase)).map((lot) => (
                    <MenuItem key={lot.lotId} value={lot.lotId}>{`Block ${lot.block} - Lot ${lot.lotNumber}`}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} multiline minRows={3} />
                <TextField select label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="issue_found">Issue Found</MenuItem>
                </TextField>
                <Button variant="contained" onClick={submit} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}>
                  Submit Patrol Log
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
              <Box sx={{ p: 2.5, borderBottom: `1px solid ${themeColors.border}` }}>
                <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>Patrol Logs</Typography>
                <Typography variant="body2" color="text.secondary">{rows.length} total logs</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Checkpoint</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Officer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Logged</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 4 }}>
                          <Typography color="text.secondary">No patrol logs yet.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : paginatedRows.map((item) => (
                      <TableRow key={item._id} hover>
                        <TableCell sx={{ minWidth: 190 }}>
                          <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary }}>{item.area}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.checkpoint}</Typography>
                        </TableCell>
                        <TableCell>
                          {item.officerId?.firstName || ''} {item.officerId?.lastName || ''}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={item.status} color={item.status === 'issue_found' ? 'warning' : 'success'} />
                        </TableCell>
                        <TableCell>{new Date(item.loggedAt || item.createdAt).toLocaleString()}</TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography variant="body2" color="text.secondary">{item.notes || 'No notes'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={rows.length}
                page={page}
                onPageChange={(event, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default SecurityPatrolSchedule;
