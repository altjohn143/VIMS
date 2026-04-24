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
import axios from 'axios';
import toast from 'react-hot-toast';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const AdminDashboardGraphs = () => {
  const [paymentData, setPaymentData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [reportType, setReportType] = useState('financial');
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');

  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);

      // Load payment data for the last 6 months
      const paymentPromises = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        paymentPromises.push(
          axios.get(`/api/payments/admin/stats?year=${year}&month=${month}`)
            .then(res => ({
              month: date.toLocaleString('default', { month: 'short' }),
              year,
              amount: res.data?.data?.monthlyCollected || 0,
              count: res.data?.data?.paymentCount || 0
            }))
            .catch(() => ({
              month: date.toLocaleString('default', { month: 'short' }),
              year,
              amount: 0,
              count: 0
            }))
        );
      }

      const paymentResults = await Promise.all(paymentPromises);
      setPaymentData(paymentResults);

      // Load user registration data for the last 6 months
      const userPromises = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        userPromises.push(
          axios.get(`/api/users/stats/registrations?year=${year}&month=${month}`)
            .then(res => ({
              month: date.toLocaleString('default', { month: 'short' }),
              year,
              count: res.data?.count || 0
            }))
            .catch(() => ({
              month: date.toLocaleString('default', { month: 'short' }),
              year,
              count: 0
            }))
        );
      }

      const userResults = await Promise.all(userPromises);
      setUserData(userResults);

    } catch (error) {
      console.error('Error loading graph data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generateAIReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await axios.post('/api/ai/reports/admin/financial', {
        period: reportPeriod,
        year: reportYear,
        month: reportPeriod === 'monthly' ? reportMonth : undefined
      });

      if (response.data?.success) {
        setAiReport(response.data.data.report);
        toast.success('AI report generated successfully');
      } else {
        throw new Error(response.data?.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating AI report:', error);
      toast.error(error.response?.data?.error || 'Failed to generate AI report');
    } finally {
      setGeneratingReport(false);
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
                    data={[
                      { name: 'Online', value: 65 },
                      { name: 'Cash', value: 25 },
                      { name: 'Check', value: 10 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Online', value: 65 },
                      { name: 'Cash', value: 25 },
                      { name: 'Check', value: 10 }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
          Generate AI Financial Report
        </Button>
      </Box>

      {/* AI Report Dialog */}
      <Dialog open={aiReportOpen} onClose={() => setAiReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate AI Financial Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="financial">Financial Report</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiReportOpen(false)}>Close</Button>
          <Button
            onClick={generateAIReport}
            variant="contained"
            disabled={generatingReport}
          >
            {generatingReport ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboardGraphs;