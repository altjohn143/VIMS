import React, { useEffect, useState } from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Typography,
  Button,
  CircularProgress,
  Popper,
  ClickAwayListener,
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

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

const NotificationPanel = ({ anchorEl, open, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.data || []);
      }
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      toast.success('Marked all as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-end"
      style={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          sx={{
            width: '380px',
            maxHeight: '500px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)',
            border: `1px solid ${themeColors.border}`,
            mt: 1,
            mr: 2
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${themeColors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                Notifications
              </Typography>
              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                {unreadCount} unread
              </Typography>
            </Box>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={markAllRead}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: themeColors.primary,
                  fontSize: '0.75rem'
                }}
              >
                Mark all read
              </Button>
            )}
          </Box>

          {/* Notifications List */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '6px'
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent'
              },
              '&::-webkit-scrollbar-thumb': {
                background: themeColors.border,
                borderRadius: '3px',
                '&:hover': {
                  background: themeColors.textSecondary
                }
              }
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <CircularProgress size={40} />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: themeColors.textSecondary, fontSize: '0.9rem' }}>
                  No notifications yet
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((n, idx) => (
                  <React.Fragment key={n._id}>
                    <ListItem
                      onClick={() => !n.readAt && markAsRead(n._id)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        cursor: !n.readAt ? 'pointer' : 'default',
                        bgcolor: !n.readAt ? 'rgba(22, 163, 74, 0.04)' : 'transparent',
                        '&:hover': { bgcolor: !n.readAt ? 'rgba(22, 163, 74, 0.08)' : 'transparent' },
                        borderBottom: idx < notifications.length - 1 ? `1px solid ${themeColors.border}` : 'none'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                            <Typography
                              sx={{
                                fontWeight: !n.readAt ? 700 : 600,
                                color: themeColors.textPrimary,
                                fontSize: '0.9rem',
                                flex: 1
                              }}
                              noWrap
                            >
                              {n.title}
                            </Typography>
                            {!n.readAt && (
                              <Chip
                                size="small"
                                label="New"
                                sx={{
                                  height: '18px',
                                  fontSize: '0.65rem',
                                  bgcolor: 'rgba(59, 130, 246, 0.15)',
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                  flexShrink: 0
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            sx={{
                              fontSize: '0.8rem',
                              color: themeColors.textSecondary,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              mt: 0.3
                            }}
                          >
                            {n.body}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          {/* Footer */}
          {notifications.length > 0 && (
            <Box
              sx={{
                p: 1.5,
                borderTop: `1px solid ${themeColors.border}`,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Button
                fullWidth
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: themeColors.primary,
                  fontSize: '0.85rem',
                  '&:hover': { bgcolor: 'rgba(22, 163, 74, 0.08)' }
                }}
                onClick={() => {
                  window.location.href = '/notifications';
                }}
              >
                View all notifications
              </Button>
            </Box>
          )}
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};

export default NotificationPanel;
