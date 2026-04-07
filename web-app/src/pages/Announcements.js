import React, { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Container, Typography } from '@mui/material';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Announcements = () => {
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/announcements');
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Community Announcements
      </Typography>
      {rows.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">No announcements available.</Typography>
          </CardContent>
        </Card>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((item) => (
          <Card key={item._id}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Chip
                  size="small"
                  label={item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'Draft'}
                  color={item.publishedAt ? 'success' : 'default'}
                />
              </Box>
              <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
};

export default Announcements;
