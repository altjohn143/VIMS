import React, { useCallback, useEffect, useState } from 'react';
import {
  Container, Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const statusColor = (status) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'ai_flagged') return 'error';
  if (status === 'manual_review') return 'warning';
  return 'default';
};

const AdminVerificationQueue = () => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/verifications/admin/queue', { params: { status } });
      if (res.data.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load verification queue');
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    await axios.put(`/api/verifications/admin/${id}/approve`, { reviewNotes: 'Approved by admin' });
    toast.success('Verification approved');
    load();
  };
  const reject = async (id) => {
    await axios.put(`/api/verifications/admin/${id}/reject`, { rejectReason: 'Verification mismatch' });
    toast.success('Verification rejected');
    load();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">AI Verification Queue</Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="ai_processing">AI Processing</MenuItem>
            <MenuItem value="ai_flagged">AI Flagged</MenuItem>
            <MenuItem value="manual_review">Manual Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Resident</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>AI Score</TableCell>
              <TableCell>Flags</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.userId?.firstName} {r.userId?.lastName}</TableCell>
                <TableCell>{r.userId?.email}</TableCell>
                <TableCell><Chip size="small" color={statusColor(r.status)} label={r.status} /></TableCell>
                <TableCell>{r.aiResult?.score ?? '-'}</TableCell>
                <TableCell>{(r.aiResult?.flags || []).join(', ') || '-'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => approve(r._id)}>Approve</Button>
                  <Button size="small" color="error" onClick={() => reject(r._id)}>Reject</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default AdminVerificationQueue;
