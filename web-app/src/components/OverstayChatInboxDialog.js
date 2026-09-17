import React, { useEffect, useState } from 'react';
import { Alert, Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { ChatOutlined, Close, HomeOutlined, LocationOnOutlined, PersonOutlined, WarningAmberRounded } from '@mui/icons-material';
import axios from 'axios';
import VisitorOverstayChatDialog from './VisitorOverstayChatDialog';

const residentName = (row) => `${row.resident?.firstName || ''} ${row.resident?.lastName || ''}`.trim() || 'Resident';

export default function OverstayChatInboxDialog({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [visitor, setVisitor] = useState(null);
  useEffect(() => { if (open) axios.get('/api/visitors/overstay-chats').then((res) => setRows(res.data?.data || [])).catch(() => setRows([])); }, [open]);
  return <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ fontWeight: 900, pr: 6, py: 2.25, bgcolor: '#f8fafc' }}>
        <Stack direction="row" spacing={1.25} alignItems="center"><Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#fff7ed', color: '#c2410c' }}><WarningAmberRounded /></Box><Box><Typography fontWeight={900}>Overstay messages</Typography><Typography variant="caption" color="text.secondary">Active resident–security follow-ups only</Typography></Box></Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 20 }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2, bgcolor: '#f8fafc' }}>
        {rows.length ? <Stack spacing={1.25}>{rows.map((row) => <Box key={row.visitor?._id} role="button" tabIndex={0} onClick={() => setVisitor(row.visitor)} onKeyDown={(event) => event.key === 'Enter' && setVisitor(row.visitor)} sx={{ cursor: 'pointer', p: 1.75, border: '1px solid #fed7aa', borderRadius: 2.5, bgcolor: '#fff', transition: 'all .18s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(194,65,12,.12)', borderColor: '#fb923c' } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Box sx={{ minWidth: 0 }}><Typography fontWeight={900} color="#9a3412">{row.visitor?.visitorName || 'Visitor'}</Typography><Typography variant="caption" color="text.secondary">Overstaying visitor</Typography></Box><Chip icon={<WarningAmberRounded />} label="OVERSTAYING" size="small" sx={{ fontWeight: 800, bgcolor: '#fff1f2', color: '#dc2626', border: '1px solid #fecaca' }} /></Stack>
          <Stack spacing={.6} sx={{ mt: 1.25 }}><Typography variant="body2" sx={{ display: 'flex', gap: .75, alignItems: 'center' }}><PersonOutlined fontSize="small" color="action" />Resident Name — <b>{residentName(row)}</b></Typography><Typography variant="body2" sx={{ display: 'flex', gap: .75, alignItems: 'center' }}><HomeOutlined fontSize="small" color="action" />Lot Address — <b>{row.resident?.houseNumber || 'Not recorded'}</b></Typography><Typography variant="body2" sx={{ display: 'flex', gap: .75, alignItems: 'center' }}><LocationOnOutlined fontSize="small" color="action" />Visitor Name — <b>{row.visitor?.visitorName || 'Visitor'}</b></Typography></Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, pt: 1.25, borderTop: '1px solid #f1f5f9' }}><ChatOutlined fontSize="small" color="success" /><Typography noWrap variant="body2" color="text.secondary">{row.lastMessage?.body || 'Open conversation'}</Typography></Box>
        </Box>)}</Stack> : <Alert severity="info" sx={{ mt: 1 }}>No active overstaying visitors have a conversation yet.</Alert>}
      </DialogContent>
    </Dialog>
    <VisitorOverstayChatDialog visitor={visitor} open={Boolean(visitor)} onClose={() => setVisitor(null)} />
  </>;
}
