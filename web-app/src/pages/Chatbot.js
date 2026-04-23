import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Chatbot = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setMessage('');
    try {
      const res = await axios.post('/api/ai/chat', { message: trimmed });
      const reply = res.data?.data?.reply || 'No response received.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f3f5f7', py: 3 }}>
      <Container maxWidth="md">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            VIMS AI Assistant
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            Ask about registration, visitors, payments, announcements, lot recommendations, and village workflows.
          </Typography>
          <Box sx={{ minHeight: 360, maxHeight: 460, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, mb: 2 }}>
            {messages.length === 0 && (
              <Typography sx={{ color: '#94a3b8' }}>
                Start by typing a question below.
              </Typography>
            )}
            {messages.map((m, idx) => (
              <Box key={idx} sx={{ mb: 1.25, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <Box sx={{ display: 'inline-block', px: 1.5, py: 1, borderRadius: 2, backgroundColor: m.role === 'user' ? '#dcfce7' : '#eef2ff' }}>
                  <Typography variant="body2">{m.content}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button variant="contained" endIcon={<SendIcon />} disabled={loading} onClick={sendMessage}>
              Send
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Chatbot;
