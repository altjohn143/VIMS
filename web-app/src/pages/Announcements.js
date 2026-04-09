import React, { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Container, Typography, Divider } from '@mui/material';
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
        bgcolor: themeColors.background,
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          '@keyframes fadeUpSoft': {
            from: { opacity: 0, transform: 'translateY(14px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Box
          sx={{
            mb: 3,
            animation: 'fadeUpSoft 0.5s ease',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: themeColors.primary,
              mb: 0.75,
            }}
          >
            Community Updates
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', md: '1.8rem' },
              fontWeight: 900,
              color: themeColors.textPrimary,
            }}
          >
            Announcements & Advisories
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              maxWidth: 560,
              fontSize: '0.9rem',
              color: themeColors.textSecondary,
              fontWeight: 500,
            }}
          >
            Stay informed about the latest community news, maintenance advisories, security reminders,
            and upcoming events in Casimiro Westville Homes.
          </Typography>
        </Box>

        {rows.length === 0 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
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
          {rows.map((item) => (
            <Card
              key={item._id}
              elevation={0}
              sx={{
                borderRadius: 3,
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

                  <Chip
                    size="small"
                    label={item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'Draft'}
                    sx={{
                      alignSelf: 'flex-start',
                      bgcolor: item.publishedAt ? '#dcfce7' : '#e5e7eb',
                      color: item.publishedAt ? themeColors.primary : '#4b5563',
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  />
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
  );
};

export default Announcements;
