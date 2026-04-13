import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  Chip,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Notifications = () => {
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
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await axios.get('/api/notifications');
      if (res.data.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    }
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await axios.put('/api/notifications/read-all');
    toast.success('Marked all as read');
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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.4 }}>
            <NotificationsIcon sx={{ color: '#bef264' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Alerts & Updates
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Keep track of important activity and community reminders.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="h6" sx={{ color: themeColors.textPrimary, fontWeight: 700 }}>
            Notifications ({rows.length})
          </Typography>
          <Button
            onClick={markAll}
            variant="contained"
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: themeColors.primary,
              '&:hover': { bgcolor: themeColors.primaryDark }
            }}
          >
            Mark all read
          </Button>
        </Paper>

        <Paper
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <List>
            {rows.map((n) => (
              <ListItem
                key={n._id}
                divider
                sx={{
                  alignItems: 'flex-start',
                  py: 1.6,
                  '&:hover': { backgroundColor: 'rgba(22, 163, 74, 0.04)' }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary }}>{n.title}</Typography>
                      {!n.readAt && (
                        <Chip
                          size="small"
                          label="Unread"
                          sx={{
                            bgcolor: 'rgba(59, 130, 246, 0.15)',
                            color: '#1d4ed8',
                            fontWeight: 700
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={`${n.body} • ${new Date(n.createdAt).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
};

export default Notifications;
