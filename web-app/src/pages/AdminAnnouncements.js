import React, { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  ArrowBack as ArrowBackIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishedIcon,
  DeleteOutline as DeleteOutlineIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const emptyForm = { title: '', body: '', isPublished: true };

const AdminAnnouncements = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [viewFilter, setViewFilter] = useState('all');

  const themeColors = {
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    background: '#f3f5f7',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

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
    const confirmed = window.confirm('Delete this announcement permanently?');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/announcements/${id}`);
      toast.success('Announcement deleted');
      load();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const filteredRows = rows.filter((item) => {
    const byStatus =
      viewFilter === 'all' ||
      (viewFilter === 'published' && item.isPublished) ||
      (viewFilter === 'draft' && !item.isPublished);
    const q = query.trim().toLowerCase();
    const byQuery =
      !q ||
      item.title?.toLowerCase().includes(q) ||
      item.body?.toLowerCase().includes(q) ||
      `${item.createdBy?.firstName || ''} ${item.createdBy?.lastName || ''}`.toLowerCase().includes(q);
    return byStatus && byQuery;
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `,
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
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
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2, color: themeColors.textPrimary, bgcolor: 'rgba(15,23,42,0.04)', border: `1px solid ${themeColors.border}`, '&:hover': { bgcolor: 'rgba(15,23,42,0.08)' } }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Admin Announcements</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Card
          sx={{
            mb: 3,
            borderRadius: '20px',
            color: 'white',
            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primaryDark} 100%)`,
            boxShadow: '0 16px 34px rgba(22,101,52,0.24)',
            border: '1px solid rgba(255,255,255,0.10)',
            animation: 'fadeUpSoft 0.45s ease'
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)' }}>
                <CampaignIcon sx={{ color: '#d9f99d' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>Community Announcements</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.86)', fontWeight: 600 }}>
                  Post updates and keep residents informed.
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${rows.length} total`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontWeight: 800,
                borderRadius: '999px'
              }}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.52s ease' }}>
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
                helperText={`${form.body.length}/500`}
                inputProps={{ maxLength: 500 }}
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
                <Button variant="contained" onClick={createAnnouncement} disabled={saving} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 800, px: 2.2, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}>
                  {saving ? 'Posting...' : 'Post Announcement'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.58s ease' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
              <TextField
                size="small"
                placeholder="Search announcements..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ minWidth: { md: 340 } }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: themeColors.textSecondary, mr: 1, fontSize: 20 }} />
                }}
              />
              <Stack direction="row" spacing={1}>
                <Button size="small" variant={viewFilter === 'all' ? 'contained' : 'outlined'} onClick={() => setViewFilter('all')} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>All</Button>
                <Button size="small" variant={viewFilter === 'published' ? 'contained' : 'outlined'} onClick={() => setViewFilter('published')} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Published</Button>
                <Button size="small" variant={viewFilter === 'draft' ? 'contained' : 'outlined'} onClick={() => setViewFilter('draft')} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Draft</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2}>
          {filteredRows.map((item) => (
            <Card key={item._id} sx={{ borderRadius: '18px', boxShadow: '0 10px 24px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.62s ease' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {item.title}
                  </Typography>
                  <Chip size="small" label={item.isPublished ? 'Published' : 'Draft'} color={item.isPublished ? 'success' : 'default'} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Author: {item.createdBy?.firstName || 'System'} {item.createdBy?.lastName || ''}{' '}
                  {item.createdBy?.role ? `(${item.createdBy.role})` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                </Typography>
                <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={item.isPublished ? <UnpublishedIcon /> : <PublishIcon />}
                    onClick={() => togglePublish(item._id, item.isPublished)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                  >
                    {item.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => remove(item._id)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                  >
                    Delete
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {filteredRows.length === 0 && (
            <Card sx={{ borderRadius: '18px', border: `1px dashed ${themeColors.border}`, boxShadow: 'none' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CampaignIcon sx={{ color: themeColors.textSecondary, fontSize: 42, mb: 1 }} />
                <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary }}>No announcements found</Typography>
                <Typography sx={{ color: themeColors.textSecondary, mt: 0.5 }}>Try changing your search or filter.</Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default AdminAnnouncements;
