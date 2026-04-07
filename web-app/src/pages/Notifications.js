import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText, Button, Box, Chip } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [rows, setRows] = useState([]);

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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Notifications</Typography>
        <Button onClick={markAll}>Mark all read</Button>
      </Box>
      <Paper>
        <List>
          {rows.map((n) => (
            <ListItem key={n._id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{n.title}</Typography>
                    {!n.readAt && <Chip size="small" label="Unread" color="info" />}
                  </Box>
                }
                secondary={`${n.body} • ${new Date(n.createdAt).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default Notifications;
