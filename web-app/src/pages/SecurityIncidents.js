import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const initialForm = {
  title: '',
  description: '',
  location: '',
  severity: 'medium'
};

const SecurityIncidents = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/incidents');
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load incidents');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createIncident = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    try {
      await axios.post('/api/incidents', form);
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Incident Reports</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <TextField label="Description" value={form.description} multiline minRows={3} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <TextField label="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          <TextField select label="Severity" value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </TextField>
          <Box><Button variant="contained" onClick={createIncident}>Submit Incident</Button></Box>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {rows.map((item) => (
          <Paper key={item._id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.location || 'No location'} | Reported by {item.reportedBy?.firstName || ''} {item.reportedBy?.lastName || ''} | {new Date(item.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" label={item.severity} color={item.severity === 'critical' ? 'error' : item.severity === 'high' ? 'warning' : 'default'} />
                <Chip size="small" label={item.status} />
                <Button size="small" onClick={() => setStatus(item._id, 'investigating')}>Investigate</Button>
                <Button size="small" onClick={() => setStatus(item._id, 'resolved')}>Resolve</Button>
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
};

export default SecurityIncidents;
