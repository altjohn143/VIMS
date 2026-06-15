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

const SecurityDashboardGraphs = () => {
  const [visitorData, setVisitorData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [incidentData, setIncidentData] = useState([]);
  const [visitorStatusData, setVisitorStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [reportType, setReportType] = useState('visitors');
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');

  useEffect(() => {
    loadGraphData();
    // loadGraphData only uses stable module imports and local helper functions during initial dashboard hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateLabel = (dateKey) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('default', { month: 'short', day: 'numeric' });
  };

  const incrementDay = (dateKey, days) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return getDateKey(date);
  };

  const buildFallbackDateKeys = () => {
    const todayKey = getDateKey(new Date());
    return Array.from({ length: 7 }, (_, index) => incrementDay(todayKey, index - 6));
  };

  const buildDateKeys = (...collections) => {
    const keys = collections
      .flat()
      .map((item) => getDateKey(item?.createdAt || item?.loggedAt || item?.occurredAt || item?.expectedArrival))
      .filter(Boolean);

    const uniqueKeys = [...new Set(keys)].sort();
    if (uniqueKeys.length > 0) return uniqueKeys.slice(-7);
    return buildFallbackDateKeys();
  };

  const buildStatusData = (visitors) => {
    const statusLabels = {
      pending: 'Pending',
      approved: 'Approved',
      active: 'Active',
      completed: 'Completed',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    };
    const counts = visitors.reduce((acc, visitor) => {
      const status = visitor.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusLabels)
      .map(([status, label]) => ({ name: label, value: counts[status] || 0 }))
      .filter((entry) => entry.value > 0);
  };

  const loadGraphData = async () => {
    try {
      setLoading(true);

      const [visitorsResult, serviceResult, incidentsResult] = await Promise.allSettled([
        axios.get('/api/visitors'),
        axios.get('/api/service-requests'),
        axios.get('/api/incidents')
      ]);

      const visitors = visitorsResult.status === 'fulfilled' && Array.isArray(visitorsResult.value.data?.data)
        ? visitorsResult.value.data.data
        : [];
      const serviceRequests = serviceResult.status === 'fulfilled' && Array.isArray(serviceResult.value.data?.data)
        ? serviceResult.value.data.data
        : [];
      const incidents = incidentsResult.status === 'fulfilled' && Array.isArray(incidentsResult.value.data?.data)
        ? incidentsResult.value.data.data
        : [];
      const dateKeys = buildDateKeys(visitors, serviceRequests, incidents);

      setVisitorData(dateKeys.map((dateKey) => {
        const dailyVisitors = visitors.filter((visitor) => getDateKey(visitor.createdAt || visitor.expectedArrival) === dateKey);
        return {
          date: getDateLabel(dateKey),
          total: dailyVisitors.length,
          approved: dailyVisitors.filter((visitor) => ['approved', 'active', 'completed'].includes(visitor.status)).length,
          pending: dailyVisitors.filter((visitor) => visitor.status === 'pending').length
        };
      }));

      setServiceData(dateKeys.map((dateKey) => {
        const dailyRequests = serviceRequests.filter((request) => getDateKey(request.createdAt) === dateKey);
        return {
          date: getDateLabel(dateKey),
          total: dailyRequests.length,
          pending: dailyRequests.filter((request) => ['pending', 'under-review', 'assigned', 'in-progress'].includes(request.status)).length,
          completed: dailyRequests.filter((request) => request.status === 'completed').length
        };
      }));

      setIncidentData(dateKeys.map((dateKey) => {
        const dailyIncidents = incidents.filter((incident) => getDateKey(incident.createdAt || incident.occurredAt) === dateKey);
        return {
          date: getDateLabel(dateKey),
          total: dailyIncidents.length,
          resolved: dailyIncidents.filter((incident) => incident.status === 'resolved').length,
          pending: dailyIncidents.filter((incident) => incident.status !== 'resolved').length
        };
      }));

      setVisitorStatusData(buildStatusData(visitors));

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
                    data={visitorStatusData.length ? visitorStatusData : [{ name: 'No Visitors', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => visitorStatusData.length ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(visitorStatusData.length ? visitorStatusData : [{ name: 'No Visitors', value: 1 }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={visitorStatusData.length ? COLORS[index % COLORS.length] : '#e2e8f0'} />
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
