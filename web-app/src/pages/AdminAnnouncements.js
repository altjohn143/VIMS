import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const emptyForm = { title: '', body: '', isPublished: true };

const AdminAnnouncements = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/announcements/admin');
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAnnouncement = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    try {
      setSaving(true);
      const res = await axios.post('/api/announcements', {
        title: form.title,
        body: form.body,
        isPublished: form.isPublished
      });
      if (res.data?.success) {
        toast.success('Announcement posted');
        setForm(emptyForm);
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (id, isPublished) => {
    try {
      await axios.put(`/api/announcements/${id}`, { isPublished: !isPublished });
      toast.success(!isPublished ? 'Announcement published' : 'Announcement unpublished');
      load();
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`/api/announcements/${id}`);
      toast.success('Announcement deleted');
      load();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Admin Announcements
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Message"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              multiline
              minRows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublished}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
              }
              label="Publish immediately"
            />
            <Box>
              <Button variant="contained" onClick={createAnnouncement} disabled={saving}>
                Post Announcement
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {rows.map((item) => (
          <Card key={item._id}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Chip size="small" label={item.isPublished ? 'Published' : 'Draft'} color={item.isPublished ? 'success' : 'default'} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Author: {item.createdBy?.firstName || 'System'} {item.createdBy?.lastName || ''}{' '}
                {item.createdBy?.role ? `(${item.createdBy.role})` : ''}
              </Typography>
              <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button size="small" onClick={() => togglePublish(item._id, item.isPublished)}>
                  {item.isPublished ? 'Unpublish' : 'Publish'}
                </Button>
                <Button size="small" color="error" onClick={() => remove(item._id)}>
                  Delete
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
};

export default AdminAnnouncements;
