import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Chip
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  ArrowBack as ArrowBackIcon,
  AdminPanelSettings as AdminIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const themeColors = {
  primary: '#166534',
  primaryLight: '#22c55e',
  primaryDark: '#14532d',
  background: '#f3f5f7',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const reportCards = [
  { title: 'Service Requests Reports', to: '/admin/service-requests', description: 'Track and review requests raised by residents.' },
  { title: 'Visitor Reports', to: '/admin/visitor-management', description: 'View visitor trends, approvals, and gate logs.' },
  { title: 'Payments Reports', to: '/admin/payments', description: 'Monitor collections, pending balances, and receipts.' },
  { title: 'Reservations', to: '/admin/report-schedules', description: 'Manage shared venues and equipment bookings.' }
];

const AdminReports = () => (
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
        <IconButton
          component={RouterLink}
          to="/dashboard"
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
        <AdminIcon sx={{ mr: 1.5, color: themeColors.primary }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Admin Reports
        </Typography>
        <Avatar sx={{ width: 36, height: 36, bgcolor: themeColors.primary }}>
          <AssessmentIcon sx={{ fontSize: 20 }} />
        </Avatar>
      </Toolbar>
    </AppBar>

    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: '22px',
          color: '#fff',
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
          boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)',
          animation: 'fadeUpSoft .45s ease-out'
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
          Reports Center
        </Typography>
        <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
          Open each module to view operational insights and export-ready data.
        </Typography>
        <Chip
          label={`${reportCards.length} modules`}
          size="small"
          sx={{
            mt: 1.5,
            bgcolor: 'rgba(255,255,255,0.16)',
            color: '#fff',
            fontWeight: 700
          }}
        />
      </Box>

      <Grid container spacing={2.5}>
        {reportCards.map((item, index) => (
          <Grid item xs={12} sm={6} key={item.to}>
            <Card
              sx={{
                borderRadius: '20px',
                border: `1px solid ${themeColors.border}`,
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
                height: '100%',
                animation: `fadeUpSoft ${0.45 + index * 0.08}s ease-out`
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ mb: 0.8, fontWeight: 700, color: themeColors.textPrimary }}>
                  {item.title}
                </Typography>
                <Typography sx={{ mb: 2, color: themeColors.textSecondary, fontSize: 14 }}>
                  {item.description}
                </Typography>
                <Button
                  component={RouterLink}
                  to={item.to}
                  variant="contained"
                  sx={{
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    bgcolor: themeColors.primary,
                    '&:hover': { bgcolor: themeColors.primaryDark }
                  }}
                >
                  Open Module
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

export default AdminReports;
