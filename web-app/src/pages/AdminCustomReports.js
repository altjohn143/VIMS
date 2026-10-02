import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, FormControl, Grid, InputLabel, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import { Download as DownloadIcon, PictureAsPdf as PdfIcon, TableChart as CsvIcon } from '@mui/icons-material';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { getBackendApiUrl } from '../utils/api';

const reportOptions = [
  { value: 'activity', label: 'Complete resident activity history', hint: 'Account profile, service requests and complaints, reservations, payments, and visitor passes in one timeline.' },
  { value: 'service-requests', label: 'Service requests and complaints', hint: 'Includes every complaint because complaints are handled as service requests.' },
  { value: 'reservations', label: 'Reservation requests', hint: 'Venue and equipment reservations, including their current status.' },
  { value: 'payments', label: 'Payment history', hint: 'Invoices, payment method, status, and recorded amount.' },
  { value: 'visitors', label: 'Visitor passes and visit history', hint: 'Visitors invited by the resident, including visit schedule and pass status.' },
  { value: 'residents', label: 'Resident account directory', hint: 'Account and contact records for the selected resident or lot.' }
];

export default function AdminCustomReports() {
  const [residents, setResidents] = useState([]);
  const [reportType, setReportType] = useState('activity');
  const [residentId, setResidentId] = useState('');
  const [lot, setLot] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState('');
  const [loadingResidents, setLoadingResidents] = useState(true);

  useEffect(() => {
    axios.get('/api/users', { params: { role: 'resident', limit: 1000 } })
      .then((response) => setResidents((response.data?.data || response.data?.users || []).filter((user) => user.role === 'resident')))
      .catch(() => toast.error('Unable to load residents for report filters.'))
      .finally(() => setLoadingResidents(false));
  }, []);

  const exportReport = async (format) => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error('Start date and time must be before the end date and time.');
      return;
    }
    setExporting(format);
    try {
      const params = new URLSearchParams({ format, reportType, timezoneOffset: String(new Date().getTimezoneOffset()) });
      if (residentId) params.set('residentId', residentId);
      if (lot.trim()) params.set('lot', lot.trim());
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());
      const response = await fetch(getBackendApiUrl(`/api/custom-reports/export?${params}`), {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'The report could not be exported.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VIMS_Custom_${reportType}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report exported.`);
    } catch (error) {
      toast.error(error.message || 'Export failed.');
    } finally {
      setExporting('');
    }
  };

  const selectedOption = reportOptions.find((option) => option.value === reportType);
  return (
    <Box sx={{ minHeight: '100%', py: 3, bgcolor: '#f3f5f7' }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, boxShadow: '0 12px 35px rgba(15,23,42,.08)' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1 }}>
            <DownloadIcon sx={{ color: '#007A18', fontSize: 32 }} />
            <Box><Typography variant="h4" fontWeight={800}>Custom Reports</Typography><Typography color="text.secondary">Export exactly the records needed for an account, resident, lot, or time period.</Typography></Box>
          </Box>
          <Alert severity="info" sx={{ mt: 3, mb: 3 }}>Choose a resident for a single-account report. Leave it empty to report on all residents, or enter a lot to narrow the results. The date and time filter applies to when each record was created.</Alert>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Report content</InputLabel><Select value={reportType} label="Report content" onChange={(event) => setReportType(event.target.value)}>{reportOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl><Typography variant="caption" color="text.secondary">{selectedOption?.hint}</Typography></Grid>
            <Grid item xs={12} md={6}><FormControl fullWidth disabled={loadingResidents}><InputLabel>Specific resident (optional)</InputLabel><Select value={residentId} label="Specific resident (optional)" onChange={(event) => setResidentId(event.target.value)}><MenuItem value="">All residents</MenuItem>{residents.map((resident) => <MenuItem key={resident._id} value={resident._id}>{resident.firstName} {resident.lastName} — {resident.houseBlock ? `Block ${resident.houseBlock}, ` : ''}Lot {resident.houseLot || resident.houseNumber || 'N/A'}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Lot or house number (optional)" value={lot} onChange={(event) => setLot(event.target.value)} placeholder="e.g. 12" /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="From date and time" type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="To date and time" type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 4 }}>
            <Button variant="contained" startIcon={exporting === 'pdf' ? <CircularProgress size={18} color="inherit" /> : <PdfIcon />} disabled={!!exporting} onClick={() => exportReport('pdf')} sx={{ bgcolor: '#007A18', '&:hover': { bgcolor: '#003D07' } }}>{exporting === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}</Button>
            <Button variant="outlined" startIcon={exporting === 'csv' ? <CircularProgress size={18} /> : <CsvIcon />} disabled={!!exporting} onClick={() => exportReport('csv')}> {exporting === 'csv' ? 'Preparing CSV…' : 'Export CSV'}</Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
