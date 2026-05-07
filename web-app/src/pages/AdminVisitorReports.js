import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AppBar,
  Toolbar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  InputAdornment
} from '@mui/material';
import {
  Assessment as ReportIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
  People as PeopleIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon
} from '@mui/icons-material';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const themeColors = {
  primary: '#166534',
  primaryLight: '#22c55e',
  primaryDark: '#14532d',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const AdminVisitorReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (reportType !== 'all') params.status = reportType;

      const [statsRes, trendRes, recentRes] = await Promise.all([
        axios.get('/api/visitors/admin/stats', { params }),
        axios.get('/api/visitors/admin/trend', { params }),
        axios.get('/api/visitors/admin/recent', { params })
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (trendRes.data?.success) setTrendData(trendRes.data.data || []);
      if (recentRes.data?.success) setRecentVisitors(recentRes.data.data || []);

      // Prepare status breakdown for pie chart
      if (statsRes.data?.data?.totals) {
        const totals = statsRes.data.data.totals;
        const breakdown = [
          { name: 'Approved', value: totals.approvedVisitors || 0, fill: themeColors.success },
          { name: 'Pending', value: totals.pendingVisitors || 0, fill: themeColors.warning },
          { name: 'Rejected', value: totals.rejectedVisitors || 0, fill: themeColors.error },
          { name: 'Active', value: totals.activeVisitors || 0, fill: themeColors.info }
        ];
        setStatusBreakdown(breakdown);
      }
    } catch (error) {
      toast.error('Failed to fetch report data');
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, reportType]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Prepare data for export
      const exportData = {
        generatedAt: new Date().toLocaleString(),
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'All time',
        reportType: reportType !== 'all' ? reportType : 'All statuses',
        statistics: stats?.totals || {},
        recentVisitors: recentVisitors.map(v => ({
          visitorName: v.visitorName,
          resident: `${v.residentId?.firstName || ''} ${v.residentId?.lastName || ''}`.trim(),
          purpose: v.purpose,
          status: v.status,
          expectedArrival: new Date(v.expectedArrival).toLocaleString(),
          approvedBy: v.approvedBy ? `${v.approvedBy.firstName} (${v.approvedBy.role})` : 'N/A'
        }))
      };

      // Export to PDF
      const pdf = new jsPDF({ orientation: 'portrait' });
      pdf.setFont('helvetica', 'bold');
      pdf.text('VISITOR MANAGEMENT REPORT', 14, 15);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Generated: ${exportData.generatedAt}`, 14, 25);
      pdf.text(`Date Range: ${exportData.dateRange}`, 14, 32);
      pdf.text(`Report Type: ${exportData.reportType}`, 14, 39);

      pdf.setFont('helvetica', 'bold');
      pdf.text('STATISTICS', 14, 52);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const statRows = [
        ['Total Visitors:', exportData.statistics.totalVisitors || 0],
        ['Approved:', exportData.statistics.approvedVisitors || 0],
        ['Pending:', exportData.statistics.pendingVisitors || 0],
        ['Rejected:', exportData.statistics.rejectedVisitors || 0],
        ['Active Now:', exportData.statistics.activeVisitors || 0]
      ];

      let yPos = 59;
      statRows.forEach(row => {
        pdf.text(`${row[0]} ${row[1]}`, 14, yPos);
        yPos += 7;
      });

      pdf.setFont('helvetica', 'bold');
      pdf.text('RECENT VISITORS', 14, yPos + 7);

      autoTable(pdf, {
        startY: yPos + 14,
        head: [['Visitor', 'Resident', 'Purpose', 'Status', 'Arrival', 'Approved By']],
        body: exportData.recentVisitors.map(r => [
          r.visitorName,
          r.resident,
          r.purpose,
          r.status,
          r.expectedArrival,
          r.approvedBy
        ]),
        styles: { fontSize: 7 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 20 } }
      });

      pdf.save(`visitor_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report exported successfully to PDF');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'active':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
          from: { opacity: 0, transform: 'translateY(16px)' },
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
            onClick={() => navigate('/dashboard/admin/visitor-management')}
            sx={{
              mr: 2,
              color: themeColors.textPrimary,
              bgcolor: 'rgba(15,23,42,0.04)',
              border: `1px solid ${themeColors.border}`,
              '&:hover': { bgcolor: 'rgba(15,23,42,0.08)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <ReportIcon sx={{ mr: 1.5, fontSize: 28, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Visitor Reports
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header Card */}
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
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)' }}>
                <PeopleIcon sx={{ color: '#d9f99d' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Visitor Analytics
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.86)', fontWeight: 600 }}>
                  View trends, statistics, and detailed visitor reports
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${stats?.totals?.totalVisitors || 0} total visitors`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontWeight: 800,
                borderRadius: '999px'
              }}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card
          sx={{
            mb: 3,
            borderRadius: '20px',
            boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
            border: `1px solid ${themeColors.border}`,
            animation: 'fadeUpSoft 0.52s ease'
          }}
        >
          <CardContent>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DateRangeIcon sx={{ color: themeColors.textSecondary }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={reportType}
                    label="Status"
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <SelectMenuItem value="all">All Status</SelectMenuItem>
                    <SelectMenuItem value="approved">Approved</SelectMenuItem>
                    <SelectMenuItem value="pending">Pending</SelectMenuItem>
                    <SelectMenuItem value="rejected">Rejected</SelectMenuItem>
                    <SelectMenuItem value="active">Active</SelectMenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button
                  variant="contained"
                  onClick={handleExport}
                  disabled={exporting}
                  fullWidth
                  startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                  sx={{
                    borderRadius: '12px',
                    bgcolor: themeColors.primary,
                    '&:hover': { bgcolor: themeColors.primaryDark },
                    fontWeight: 700
                  }}
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.58s ease' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontWeight: 600 }}>
                      Total Visitors
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.primary }}>
                      {stats?.totals?.totalVisitors || 0}
                    </Typography>
                  </Box>
                  <PeopleIcon sx={{ fontSize: 48, color: themeColors.primary + '20' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.62s ease' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontWeight: 600 }}>
                      Approved
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.success }}>
                      {stats?.totals?.approvedVisitors || 0}
                    </Typography>
                  </Box>
                  <ApprovedIcon sx={{ fontSize: 48, color: themeColors.success + '20' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.66s ease' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontWeight: 600 }}>
                      Pending
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.warning }}>
                      {stats?.totals?.pendingVisitors || 0}
                    </Typography>
                  </Box>
                  <PendingIcon sx={{ fontSize: 48, color: themeColors.warning + '20' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 12px 26px rgba(15,23,42,0.06)', border: `1px solid ${themeColors.border}`, animation: 'fadeUpSoft 0.70s ease' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontWeight: 600 }}>
                      Rejected
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.error }}>
                      {stats?.totals?.rejectedVisitors || 0}
                    </Typography>
                  </Box>
                  <RejectedIcon sx={{ fontSize: 48, color: themeColors.error + '20' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Pie Chart */}
          {statusBreakdown.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  borderRadius: '20px',
                  boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                  border: `1px solid ${themeColors.border}`,
                  animation: 'fadeUpSoft 0.74s ease'
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                    Status Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Trend Chart */}
          {trendData.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  borderRadius: '20px',
                  boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                  border: `1px solid ${themeColors.border}`,
                  animation: 'fadeUpSoft 0.78s ease'
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                    Visitor Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visitors" stroke={themeColors.primary} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Recent Visitors Table */}
        <Card
          sx={{
            borderRadius: '20px',
            boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
            border: `1px solid ${themeColors.border}`,
            animation: 'fadeUpSoft 0.82s ease'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, p: 2.5 }}>
              Recent Visitors
            </Typography>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                      Visitor Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                      Resident
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                      Purpose
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                      Expected Arrival
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                      Approved By
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentVisitors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ color: themeColors.textSecondary }}>
                          No visitors found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentVisitors.map((visitor) => (
                      <TableRow
                        key={visitor._id}
                        sx={{
                          '&:hover': { backgroundColor: '#f8fafc' },
                          borderBottom: `1px solid ${themeColors.border}`
                        }}
                      >
                        <TableCell sx={{ color: themeColors.textPrimary }}>
                          {visitor.visitorName}
                        </TableCell>
                        <TableCell sx={{ color: themeColors.textPrimary }}>
                          {visitor.residentId
                            ? `${visitor.residentId.firstName} ${visitor.residentId.lastName}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: themeColors.textPrimary }}>
                          {visitor.purpose}
                        </TableCell>
                        <TableCell sx={{ color: themeColors.textPrimary }}>
                          {formatDate(visitor.expectedArrival)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={visitor.status}
                            size="small"
                            color={getStatusColor(visitor.status)}
                          />
                        </TableCell>
                        <TableCell sx={{ color: themeColors.textPrimary }}>
                          {visitor.approvedBy
                            ? `${visitor.approvedBy.firstName} (${visitor.approvedBy.role})`
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminVisitorReports;
