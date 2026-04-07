import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const initialForm = { area: '', checkpoint: '', notes: '', status: 'completed' };

const SecurityPatrolSchedule = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/patrols');
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load patrol logs');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.area.trim() || !form.checkpoint.trim()) {
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Patrol Logs</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <TextField label="Area" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} />
          <TextField label="Checkpoint" value={form.checkpoint} onChange={(e) => setForm((p) => ({ ...p, checkpoint: e.target.value }))} />
          <TextField label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} multiline minRows={3} />
          <TextField select label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="issue_found">Issue Found</MenuItem>
          </TextField>
          <Box><Button variant="contained" onClick={submit}>Submit Patrol Log</Button></Box>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {rows.map((item) => (
          <Paper key={item._id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{item.area} - {item.checkpoint}</Typography>
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
  );
};

export default SecurityPatrolSchedule;
