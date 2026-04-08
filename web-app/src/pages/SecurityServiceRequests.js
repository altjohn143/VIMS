import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const themeColors = {
  primary: '#2224be',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: 'rgba(99, 102, 241, 0.1)'
};

const SecurityServiceRequests = () => {
  const { getCurrentUser, logout } = useAuth();
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [assignedOnly, setAssignedOnly] = useState(true);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = { status: activeTab };
      if (priority !== 'all') params.priority = priority;
      if (category !== 'all') params.category = category;
      const res = await axios.get('/api/service-requests', { params });
      if (res.data?.success) setRows(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load service requests');
    }
  }, [activeTab, priority, category]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, nextStatus) => {
    try {
      await axios.put(`/api/service-requests/${id}/status`, { status: nextStatus });
      toast.success(`Marked as ${nextStatus}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const filteredRows = rows.filter((item) => {
    if (assignedOnly && item.assignedTo?._id !== currentUser?._id) return false;
    const haystack = `${item.title || ''} ${item.description || ''} ${item.residentId?.firstName || ''} ${item.residentId?.lastName || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const assigned = rows.filter((r) => r.status === 'assigned').length;
    const inProgress = rows.filter((r) => r.status === 'in-progress').length;
    const completed = rows.filter((r) => r.status === 'completed').length;
    return { total, assigned, inProgress, completed };
  }, [rows]);

  const handleProfileMenuOpen = (event) => setProfileAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setProfileAnchorEl(null);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: themeColors.cardBackground, borderBottom: `1px solid ${themeColors.border}` }}>
        <Toolbar>
          <IconButton component={RouterLink} to="/dashboard" sx={{ mr: 1, color: themeColors.primary }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ flexGrow: 1, fontWeight: 800, color: themeColors.textPrimary }}>
            Security Service Requests
          </Typography>
          <Button onClick={handleProfileMenuOpen} sx={{ textTransform: 'none', color: themeColors.textPrimary }}>
            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: themeColors.primary }}>
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </Avatar>
            {currentUser?.firstName || 'Security'}
          </Button>
          <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={handleProfileMenuClose}>
            <MenuItem component={RouterLink} to="/profile" onClick={handleProfileMenuClose}>
              <SettingsIcon sx={{ mr: 1, fontSize: 18 }} /> Profile Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: 18 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Total', value: stats.total, color: themeColors.info },
            { label: 'Assigned', value: stats.assigned, color: themeColors.warning },
            { label: 'In Progress', value: stats.inProgress, color: themeColors.primary },
            { label: 'Completed', value: stats.completed, color: themeColors.success }
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">{stat.label}</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile>
            <Tab value="all" label="All" />
            <Tab value="pending" label="Pending" />
            <Tab value="assigned" label="Assigned" />
            <Tab value="in-progress" label="In Progress" />
            <Tab value="completed" label="Completed" />
          </Tabs>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search resident/request"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <TextField select size="small" value={priority} onChange={(e) => setPriority(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="all">All Priority</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="urgent">Urgent</MenuItem>
          </TextField>
          <TextField select size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">All Category</MenuItem>
            <MenuItem value="security">Security</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="utilities">Utilities</MenuItem>
            <MenuItem value="sanitation">Sanitation</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <Button variant={assignedOnly ? 'contained' : 'outlined'} size="small" onClick={() => setAssignedOnly((v) => !v)}>
            {assignedOnly ? 'Assigned to me' : 'All visible'}
          </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request</TableCell>
                <TableCell>Resident</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                  </TableCell>
                  <TableCell>{item.residentId?.firstName || ''} {item.residentId?.lastName || ''}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.priority || 'normal'} color={item.priority === 'urgent' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell><Chip size="small" label={item.status} /></TableCell>
                  <TableCell>{item.assignedTo ? `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}` : 'Unassigned'}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      disabled={item.assignedTo?._id !== currentUser?._id || item.status === 'completed'}
                      onClick={() => updateStatus(item._id, 'in-progress')}
                    >
                      Start
                    </Button>
                    <Button
                      size="small"
                      disabled={item.assignedTo?._id !== currentUser?._id || item.status === 'completed'}
                      onClick={() => updateStatus(item._id, 'completed')}
                    >
                      Complete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredRows.length === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">No service requests match the selected filters.</Typography>
          </Paper>
        )}
      </Container>
    </>
  );
};

export default SecurityServiceRequests;
