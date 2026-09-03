import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const AdminDashboardGraphs = () => {
  const [paymentData, setPaymentData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [reportType, setReportType] = useState('admin_analytics');
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [exportingReport, setExportingReport] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [aiReportWarning, setAiReportWarning] = useState('');

  useEffect(() => {
    loadGraphData();
    // Set up auto-refresh every 30 seconds for live updates
    const interval = setInterval(loadGraphData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadGraphData() {
    try {
      setLoading(true);
      const response = await axios.get('/api/payments/admin/dashboard-graphs?months=6');
      const graphData = response.data?.data || {};
      setPaymentData(graphData.paymentTrend || []);
      setUserData(graphData.userTrend || []);
      setPaymentMethodData(
        (graphData.paymentMethods || []).map(item => ({
          name: item.method || 'Unspecified',
          value: item.count || 0
        }))
      );

    } catch (error) {
      console.error('Error loading graph data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const buildReportPayload = (format = 'json') => ({
    period: reportPeriod,
    year: reportYear,
    month: reportPeriod === 'monthly' ? reportMonth : undefined,
    format,
    timezoneOffset: new Date().getTimezoneOffset()
  });

  const generateAIReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await axios.post('/api/ai/reports/admin/financial', buildReportPayload('json'));

      if (response.data?.success) {
        setAiReport(response.data.data.report);
        setAiReportWarning(response.data.data.warning || '');
        toast.success('Admin analytics report generated successfully');
      } else {
        throw new Error(response.data?.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating AI report:', error);
      const apiError = error.response?.data;
      toast.error(apiError?.details || apiError?.error || error.message || 'Failed to generate AI report');
    } finally {
      setGeneratingReport(false);
    }
  }

  const exportAIReport = async (format) => {
    try {
      setExportingReport(format);
      const response = await axios.post('/api/ai/reports/admin/financial', buildReportPayload(format), {
        responseType: 'blob'
      });
      const extension = format === 'pdf' ? 'pdf' : 'csv';
      const monthPart = reportPeriod === 'monthly' ? `_${String(reportMonth).padStart(2, '0')}` : '';
      downloadBlob(
        response.data,
        `VIMS_Admin_Analytics_Report_${reportPeriod}_${reportYear}${monthPart}.${extension}`
      );
      toast.success(`${format.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error(`Error exporting ${format} report:`, error);
      toast.error(error.response?.data?.error || error.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExportingReport('');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Financial Overview & Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Payment Trends */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Payment Collections
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={paymentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₱${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Collection Amount"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Methods
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData.length > 0 ? paymentMethodData : [
                      { name: 'Online', value: 65 },
                      { name: 'Cash', value: 25 },
                      { name: 'Check', value: 10 }
                    ]}
                    cx="50%"
                    cy="45%"
                    labelLine
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={76}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(paymentMethodData.length > 0 ? paymentMethodData : [
                      { name: 'Online', value: 65 },
                      { name: 'Cash', value: 25 },
                      { name: 'Check', value: 10 }
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* User Registrations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Registration Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" name="New Registrations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Report Generator */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setAiReportOpen(true)}
          sx={{ minWidth: 200 }}
        >
          Generate Admin Analytics Report
        </Button>
      </Box>

      {/* AI Report Dialog */}
      <Dialog open={aiReportOpen} onClose={() => setAiReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate Admin Analytics Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                id="admin-analytics-report-type"
                name="reportType"
                select
                fullWidth
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="admin_analytics">Payments, Methods & Registrations</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                id="admin-analytics-report-period"
                name="reportPeriod"
                select
                fullWidth
                label="Period"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                id="admin-analytics-report-year"
                name="reportYear"
                fullWidth
                label="Year"
                type="number"
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                inputProps={{ min: 2020, max: new Date().getFullYear() }}
              />
            </Grid>
            {reportPeriod === 'monthly' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  id="admin-analytics-report-month"
                  name="reportMonth"
                  select
                  fullWidth
                  label="Month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>

          {aiReport && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {aiReport}
              </Typography>
            </Alert>
          )}
          {aiReportWarning && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              AI analysis used the fallback summary because the AI service returned: {aiReportWarning}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiReportOpen(false)}>Close</Button>
          <Button
            onClick={() => exportAIReport('csv')}
            variant="outlined"
            disabled={generatingReport || !!exportingReport}
          >
            {exportingReport === 'csv' ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            onClick={() => exportAIReport('pdf')}
            variant="outlined"
            disabled={generatingReport || !!exportingReport}
          >
            {exportingReport === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button
            onClick={generateAIReport}
            variant="contained"
            disabled={generatingReport || !!exportingReport}
          >
            {generatingReport ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboardGraphs;
