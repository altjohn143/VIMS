import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SecurityServiceRequests = () => {
  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [assignedOnly, setAssignedOnly] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = { status };
      if (priority !== 'all') params.priority = priority;
      if (category !== 'all') params.category = category;
      const res = await axios.get('/api/service-requests', { params });
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load service requests');
    }
  }, [status, priority, category]);

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

  const filteredRows = rows.filter((item) => {
    if (assignedOnly && item.assignedTo?._id !== currentUser?._id) return false;
    const haystack = `${item.title || ''} ${item.description || ''} ${item.residentId?.firstName || ''} ${item.residentId?.lastName || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Security Service Requests</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search resident/request"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in-progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </TextField>
          <TextField select size="small" value={priority} onChange={(e) => setPriority(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="all">All Priority</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="urgent">Urgent</MenuItem>
          </TextField>
          <TextField select size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">All Category</MenuItem>
            <MenuItem value="security">Security</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="utilities">Utilities</MenuItem>
            <MenuItem value="sanitation">Sanitation</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <Button variant={assignedOnly ? 'contained' : 'outlined'} size="small" onClick={() => setAssignedOnly((v) => !v)}>
            {assignedOnly ? 'Assigned to me' : 'All visible'}
          </Button>
        </Box>
      </Box>

      <Stack spacing={2}>
        {filteredRows.map((item) => (
          <Paper key={item._id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Resident: {item.residentId?.firstName || ''} {item.residentId?.lastName || ''} | Priority: {item.priority || 'normal'} | Assigned: {item.assignedTo ? `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}` : 'Unassigned'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" label={item.status} />
                <Button
                  size="small"
                  disabled={item.assignedTo?._id !== currentUser?._id || item.status === 'completed'}
                  onClick={() => updateStatus(item._id, 'in-progress')}
                >
                  Start
                </Button>
                <Button
                  size="small"
                  disabled={item.assignedTo?._id !== currentUser?._id || item.status === 'completed'}
                  onClick={() => updateStatus(item._id, 'completed')}
                >
                  Complete
                </Button>
              </Box>
            </Box>
          </Paper>
        ))}
        {filteredRows.length === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No service requests match the selected filters.</Typography>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default SecurityServiceRequests;
