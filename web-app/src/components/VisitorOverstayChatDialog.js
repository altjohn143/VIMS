import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function VisitorOverstayChatDialog({ visitor, open, onClose }) {
  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const load = async () => {
    if (!visitor?._id) return;
    setLoading(true);
    try { const response = await axios.get(`/api/visitors/${visitor._id}/overstay-chat`); setMessages(response.data?.data || []); } finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open, visitor?._id]);
  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try { await axios.post(`/api/visitors/${visitor._id}/overstay-chat`, { message: message.trim() }); setMessage(''); await load(); } finally { setSending(false); }
  };
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Overstay chat — {visitor?.visitorName}</DialogTitle>
    <DialogContent>
      <Alert severity="warning" sx={{ mb: 2 }}>This conversation is only for the resident and security, and is linked to this visitor overstay.</Alert>
      <Box sx={{ minHeight: 220, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25, p: 0.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
        {loading ? <Typography>Loading messages…</Typography> : messages.length ? messages.map((row) => {
          const securityId = row.securityId?._id || row.securityId;
          const isSecurityMessage = Boolean(securityId);
          const isMine = currentUser?.role === 'security'
            ? String(securityId) === String(currentUser?._id || currentUser?.id)
            : !isSecurityMessage;
          const sender = isSecurityMessage ? `Security${row.securityId?.firstName ? ` • ${row.securityId.firstName} ${row.securityId.lastName || ''}` : ''}` : 'Resident';
          return <Box key={row._id} sx={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '82%', p: 1.25, borderRadius: 2.5, bgcolor: isSecurityMessage ? '#fff3e0' : '#e8f5e9', border: `1px solid ${isSecurityMessage ? '#fdba74' : '#86efac'}` }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: isSecurityMessage ? '#c2410c' : '#15803d', mb: 0.35 }}>{sender}</Typography>
            <Typography variant="body2">{row.body}</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>{new Date(row.createdAt).toLocaleString()}</Typography>
          </Box>;
        }) : <Typography color="text.secondary">No messages yet.</Typography>}
      </Box>
      <TextField fullWidth multiline minRows={3} label="Message" value={message} onChange={(e) => setMessage(e.target.value)} sx={{ mt: 2 }} inputProps={{ maxLength: 1500 }} />
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button><Button variant="contained" onClick={send} disabled={sending || !message.trim()}>{sending ? 'Sending…' : 'Send message'}</Button></DialogActions>
  </Dialog>;
}
