import React, { useCallback, useEffect, useState } from 'react';
import {
  Container, Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, FormControl, InputLabel, Select, MenuItem, AppBar, Toolbar, IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AdminPanelSettings as AdminIcon,
  VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const statusColor = (status) => {
  if (status === 'approved' || status === 'documents_verified') return 'success';
  if (status === 'rejected' || status === 'ai_flagged') return 'error';
  if (status === 'manual_review') return 'warning';
  return 'default';
};

const AdminVerificationQueue = () => {
  const themeColors = {
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const navigate = useNavigate();

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
          <AdminIcon sx={{ mr: 1.5, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Verification Queue
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <VerifiedUserIcon sx={{ color: '#bef264' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              AI Verification Queue
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Review AI-screened verification results and complete approval decisions.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            mb: 2,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
              Queue Items ({rows.length})
            </Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} sx={{ borderRadius: 2.5 }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="ai_processing">AI Processing</MenuItem>
                <MenuItem value="ai_flagged">AI Flagged</MenuItem>
                <MenuItem value="manual_review">Manual Review</MenuItem>
                <MenuItem value="documents_verified">Documents verified (auto)</MenuItem>
                <MenuItem value="approved">Approved (admin)</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <Paper
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Resident</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>AI Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Flags</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id} hover sx={{ '&:hover': { backgroundColor: 'rgba(22, 163, 74, 0.04)' } }}>
                  <TableCell>
                    {r.displayResidentName
                      || [r.userId?.firstName, r.userId?.lastName].filter(Boolean).join(' ')
                      || '—'}
                  </TableCell>
                  <TableCell>{r.displayEmail || r.userId?.email || '—'}</TableCell>
                  <TableCell><Chip size="small" color={statusColor(r.status)} label={r.status} /></TableCell>
                  <TableCell>{r.aiResult?.score ?? '-'}</TableCell>
                  <TableCell>{(r.aiResult?.flags || []).join(', ') || '-'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => approve(r._id)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                      Approve
                    </Button>
                    <Button size="small" color="error" onClick={() => reject(r._id)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminVerificationQueue;
