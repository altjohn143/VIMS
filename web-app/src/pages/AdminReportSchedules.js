import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, MenuItem } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const EMPTY = { name: '', reportType: 'service_requests', recipients: '', enabled: true };

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Scheduled Report Delivery</Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>New Schedule</Button>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Recipients</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.reportType}</TableCell>
                <TableCell>{(r.recipients || []).join(', ')}</TableCell>
                <TableCell>{r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : 'Never'}</TableCell>
                <TableCell><Button size="small" onClick={() => runNow(r._id)}>Run Now</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
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
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminReportSchedules;
