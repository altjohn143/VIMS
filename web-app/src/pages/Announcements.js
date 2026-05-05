import React, { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Container, Typography, Divider, AppBar, Toolbar, IconButton, Stack } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

// Match dashboard/login color palette
const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  primaryLight: '#22c55e',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)',
};

const Announcements = () => {
  const [rows, setRows] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const navigate = useNavigate();

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
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `,
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 2, md: 0 },
        py: { xs: 0, md: 0 },
      }}
    >
      <Box sx={{ width: '100%' }}>
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
              Announcements
            </Typography>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth="md"
          sx={{
            py: { xs: 3, md: 4 },
            '@keyframes fadeUpSoft': {
              from: { opacity: 0, transform: 'translateY(14px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
        <Box
          sx={{
            mb: 3,
            animation: 'fadeUpSoft 0.5s ease'
          }}
        >
          <Card
            sx={{
              borderRadius: '22px',
              color: '#fff',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
              boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CampaignIcon sx={{ color: '#bef264' }} />
                <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.8rem' }, fontWeight: 900, color: '#fff' }}>
                  Announcements & Advisories
                </Typography>
              </Box>
              <Typography
                sx={{
                  mt: 0.75,
                  maxWidth: 560,
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 500
                }}
              >
                Stay informed about the latest community news, maintenance advisories, security reminders,
                and upcoming events in Casimiro Westville Homes.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', 'monthlyCollection'].map((category) => (
            <Chip
              key={category}
              label={category === 'all' ? 'All announcements' : 'Monthly collection'}
              clickable
              size="small"
              onClick={() => setFilterCategory(category)}
              sx={{
                borderRadius: '999px',
                fontWeight: 700,
                bgcolor: filterCategory === category ? '#d1fae5' : '#f8fafc',
                color: filterCategory === category ? themeColors.primary : themeColors.textSecondary,
                border: filterCategory === category ? `1px solid ${themeColors.primary}` : `1px solid ${themeColors.border}`,
              }}
            />
          ))}
        </Box>

        {rows.filter((item) => filterCategory === 'all' || item.category === 'monthlyCollection').length === 0 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: '20px',
              border: `1px dashed ${themeColors.border}`,
              bgcolor: themeColors.cardBackground,
              animation: 'fadeUpSoft 0.6s ease',
            }}
          >
            <CardContent sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 0.5 }}>
                No announcements yet
              </Typography>
              <Typography sx={{ color: themeColors.textSecondary, fontSize: '0.9rem' }}>
                New updates from the village administration will appear here as soon as they are published.
              </Typography>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          {rows
            .filter((item) => filterCategory === 'all' || item.category === 'monthlyCollection')
            .map((item) => (
            <Card
              key={item._id}
              elevation={0}
              sx={{
                borderRadius: '20px',
                border: `1px solid ${themeColors.border}`,
                bgcolor: themeColors.cardBackground,
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.06)',
                animation: 'fadeUpSoft 0.55s ease',
                '&:hover': {
                  boxShadow: '0 22px 40px rgba(15, 23, 42, 0.12)',
                  transform: 'translateY(-2px)',
                },
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        color: themeColors.textPrimary,
                        fontSize: '1rem',
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        color: themeColors.textSecondary,
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      By {item.createdBy?.firstName || 'System'} {item.createdBy?.lastName || ''}{' '}
                      {item.createdBy?.role ? `(${item.createdBy.role})` : ''}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      label={item.category === 'monthlyCollection' ? 'Monthly collection' : 'Community'}
                      sx={{
                        bgcolor: item.category === 'monthlyCollection' ? '#f0fdf4' : '#eff6ff',
                        color: item.category === 'monthlyCollection' ? '#166534' : '#1d4ed8',
                        fontWeight: 700,
                        borderRadius: 999,
                      }}
                    />
                    <Chip
                      size="small"
                      label={item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'Draft'}
                      sx={{
                        bgcolor: item.publishedAt ? '#dcfce7' : '#e5e7eb',
                        color: item.publishedAt ? themeColors.primary : '#4b5563',
                        fontWeight: 700,
                        borderRadius: 999,
                      }}
                    />
                  </Stack>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Typography
                  sx={{
                    mt: 0.5,
                    whiteSpace: 'pre-wrap',
                    color: themeColors.textPrimary,
                    fontSize: '0.92rem',
                    lineHeight: 1.7,
                  }}
                >
                  {item.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Announcements;
