import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const SecurityServiceRequests = () => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/service-requests', { params: { status } });
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load service requests');
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, nextStatus) => {
    try {
      await axios.put(`/api/service-requests/${id}/status`, { status: nextStatus });
      toast.success(`Marked as ${nextStatus}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Security Service Requests</Typography>
        <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="assigned">Assigned</MenuItem>
          <MenuItem value="in-progress">In Progress</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </TextField>
      </Box>

      <Stack spacing={2}>
        {rows.map((item) => (
          <Paper key={item._id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Resident: {item.residentId?.firstName || ''} {item.residentId?.lastName || ''} | Priority: {item.priority || 'normal'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" label={item.status} />
                <Button size="small" onClick={() => updateStatus(item._id, 'in-progress')}>Start</Button>
                <Button size="small" onClick={() => updateStatus(item._id, 'completed')}>Complete</Button>
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
};

export default SecurityServiceRequests;
