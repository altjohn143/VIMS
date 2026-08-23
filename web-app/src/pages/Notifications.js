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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Notifications = () => {
  const themeColors = {
    primary: '#007A18',
    primaryLight: '#00D084',
    primaryDark: '#003D07',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

  const [rows, setRows] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
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

  const markRead = async (notification) => {
    if (!notification?._id || notification.readAt) return;
    await axios.put(`/api/notifications/${notification._id}/read`);
    setRows((prev) =>
      prev.map((row) => row._id === notification._id ? { ...row, readAt: row.readAt || new Date().toISOString() } : row)
    );
  };

  const openNotificationDetails = async (notification) => {
    setSelectedNotification(notification);
    try {
      await markRead(notification);
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const getRelatedRecordId = (notification) => {
    const metadata = notification?.metadata || {};
    return metadata.visitorId ||
      metadata.paymentId ||
      metadata.serviceRequestId ||
      metadata.announcementId ||
      metadata.reservationId ||
      metadata.recordId ||
      null;
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
            background: 'linear-gradient(135deg, #003D07 0%, #007A18 52%, #00D084 100%)',
            boxShadow: '0 18px 40px rgba(0, 122, 24, 0.35)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.4 }}>
            <NotificationsIcon sx={{ color: '#00D084' }} />
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
                button
                onClick={() => openNotificationDetails(n)}
                sx={{
                  alignItems: 'flex-start',
                  py: 1.6,
                  '&:hover': { backgroundColor: 'rgba(0, 208, 132, 0.04)' }
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
                            bgcolor: 'rgba(0, 122, 24, 0.15)',
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

        <Dialog
          open={Boolean(selectedNotification)}
          onClose={() => setSelectedNotification(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: '18px' } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
            {selectedNotification?.title || 'Notification'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography sx={{ color: themeColors.textPrimary }}>
                {selectedNotification?.body || 'No additional details were provided.'}
              </Typography>
              <Box>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary, fontWeight: 800, textTransform: 'uppercase' }}>
                  Type
                </Typography>
                <Typography sx={{ color: themeColors.textPrimary, fontWeight: 700 }}>
                  {selectedNotification?.type ? String(selectedNotification.type).replace(/_/g, ' ') : 'general'}
                </Typography>
              </Box>
              {getRelatedRecordId(selectedNotification) && (
                <Box>
                  <Typography variant="caption" sx={{ color: themeColors.textSecondary, fontWeight: 800, textTransform: 'uppercase' }}>
                    Related record
                  </Typography>
                  <Typography sx={{ color: themeColors.textPrimary, fontWeight: 700, wordBreak: 'break-all' }}>
                    {getRelatedRecordId(selectedNotification)}
                  </Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                {selectedNotification?.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : ''}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedNotification(null)} variant="contained" sx={{ textTransform: 'none', bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}>
              Done
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Notifications;
