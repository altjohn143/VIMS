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

const SecurityDashboardGraphs = () => {
  const [visitorData, setVisitorData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [incidentData, setIncidentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [reportType, setReportType] = useState('visitors');
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');

  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);

      // Load visitor data for the last 7 days
      const visitorPromises = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        visitorPromises.push(
          axios.get(`/api/visitors/stats/daily?date=${dateStr}`)
            .then(res => ({
              date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              total: res.data?.data?.totalVisitors || 0,
              approved: res.data?.data?.approvedVisitors || 0,
              pending: res.data?.data?.pendingVisitors || 0
            }))
            .catch(() => ({
              date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              total: 0,
              approved: 0,
              pending: 0
            }))
        );
      }

      const visitorResults = await Promise.all(visitorPromises);
      setVisitorData(visitorResults);

      // Load service request data for the last 7 days
      const servicePromises = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        servicePromises.push(
          axios.get(`/api/service-requests/stats/daily?date=${dateStr}`)
            .then(res => ({
              date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              total: res.data?.data?.totalRequests || 0,
              pending: res.data?.data?.pendingRequests || 0,
              completed: res.data?.data?.completedRequests || 0
            }))
            .catch(() => ({
              date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              total: 0,
              pending: 0,
              completed: 0
            }))
        );
      }

      const serviceResults = await Promise.all(servicePromises);
      setServiceData(serviceResults);

      // Load incident data for the last 7 days
      const incidentPromises = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        incidentPromises.push(
          axios.get(`/api/incidents/stats/daily?date=${dateStr}`)
            .then(res => ({
              date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              total: res.data?.data?.totalIncidents || 0,
              resolved: res.data?.data?.resolvedIncidents || 0,
              pending: res.data?.data?.pendingIncidents || 0
            }))
            .catch(() => ({
              date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
              total: 0,
              resolved: 0,
              pending: 0
            }))
        );
      }

      const incidentResults = await Promise.all(incidentPromises);
      setIncidentData(incidentResults);

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
      const endpoint = reportType === 'visitors' ? 'visitors' : 'incidents';

      const response = await axios.post(`/api/ai/reports/security/${endpoint}`, {
        period: reportPeriod,
        date: reportDate
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
        Security Overview & Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Visitor Trends */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Visitor Activity
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visitorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Total Visitors"
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Approved"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Requests */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Request Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#8884d8" name="Total Requests" />
                  <Bar dataKey="pending" fill="#ff7c7c" name="Pending" />
                  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Incident Trends */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Incident Reports
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={incidentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#ff7c7c"
                    strokeWidth={2}
                    name="Total Incidents"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Visitor Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Visitor Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Approved', value: visitorData.reduce((sum, d) => sum + d.approved, 0) },
                      { name: 'Pending', value: visitorData.reduce((sum, d) => sum + d.pending, 0) },
                      { name: 'Rejected', value: Math.max(0, visitorData.reduce((sum, d) => sum + d.total - d.approved - d.pending, 0)) }
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
                      { name: 'Approved', value: visitorData.reduce((sum, d) => sum + d.approved, 0) },
                      { name: 'Pending', value: visitorData.reduce((sum, d) => sum + d.pending, 0) },
                      { name: 'Rejected', value: Math.max(0, visitorData.reduce((sum, d) => sum + d.total - d.approved - d.pending, 0)) }
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
      </Grid>

      {/* AI Report Generator */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setAiReportOpen(true)}
          sx={{ minWidth: 200 }}
        >
          Generate AI Security Report
        </Button>
      </Box>

      {/* AI Report Dialog */}
      <Dialog open={aiReportOpen} onClose={() => setAiReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate AI Security Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="visitors">Visitor Report</MenuItem>
                <MenuItem value="incidents">Incident Report</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Period"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
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

export default SecurityDashboardGraphs;