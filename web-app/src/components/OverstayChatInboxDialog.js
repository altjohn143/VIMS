import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { ChatOutlined, Close } from '@mui/icons-material';
import axios from 'axios';
import VisitorOverstayChatDialog from './VisitorOverstayChatDialog';

export default function OverstayChatInboxDialog({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [visitor, setVisitor] = useState(null);
  useEffect(() => { if (open) axios.get('/api/visitors/overstay-chats').then((res) => setRows(res.data?.data || [])).catch(() => setRows([])); }, [open]);
  return <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>Overstay messages<IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton></DialogTitle>
      <DialogContent dividers>
        {rows.length ? <List disablePadding>{rows.map((row) => <ListItemButton key={row.visitor?._id} onClick={() => setVisitor(row.visitor)} sx={{ borderRadius: 2, mb: .5 }}><ChatOutlined color="success" sx={{ mr: 1.5 }} /><ListItemText primary={row.visitor?.visitorName || 'Visitor'} secondary={row.lastMessage?.body || 'Open conversation'} /></ListItemButton>)}</List> : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No overstay conversations yet.</Typography>}
      </DialogContent>
    </Dialog>
    <VisitorOverstayChatDialog visitor={visitor} open={Boolean(visitor)} onClose={() => setVisitor(null)} />
  </>;
}
