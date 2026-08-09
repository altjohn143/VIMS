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
  TablePagination,
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

const SecurityServiceRequests = () => {
  const { getCurrentUser, logout } = useAuth();
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [staffMembers, setStaffMembers] = useState([]);
  const [assigningId, setAssigningId] = useState('');
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const isHeadOfficer =
    currentUser?.securityLevel === 'head-officer' ||
    String(currentUser?.email || '').toLowerCase() === 'security@vims.com';

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

  const loadStaff = useCallback(async () => {
    if (!isHeadOfficer) {
      setStaffMembers([]);
      return;
    }
    try {
      const res = await axios.get('/api/service-requests/admin/staff');
      if (res.data?.success) {
        setStaffMembers((res.data.data || []).filter((staff) => staff.role === 'security'));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load security staff');
    }
  }, [isHeadOfficer]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

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
    const haystack = `${item.title || ''} ${item.description || ''} ${item.residentId?.firstName || ''} ${item.residentId?.lastName || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const paginatedRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const extractLocationSignals = (item) => {
    const text = [
      item?.location,
      item?.title,
      item?.description,
      item?.residentId?.houseNumber,
    ].filter(Boolean).join(' ').toLowerCase();
    const phases = [...text.matchAll(/(?:phase|p)\s*[-:]?\s*(\d+)/gi)].map((match) => Number(match[1])).filter(Number.isFinite);
    const blocks = [...text.matchAll(/(?:block|b)\s*[-:]?\s*([a-z0-9]+)/gi)].map((match) => String(match[1]).toLowerCase());
    const lots = [...text.matchAll(/(?:lot|l)\s*[-:]?\s*([a-z0-9]+)/gi)].map((match) => String(match[1]).toLowerCase());
    return { text, phases: [...new Set(phases)], blocks: [...new Set(blocks)], lots: [...new Set(lots)] };
  };

  const getStaffRecommendation = (staff, item) => {
    const signals = extractLocationSignals(item);
    const assignedPhases = Array.isArray(staff?.assignedPhases) ? staff.assignedPhases.map(Number) : [];
    const assignedAreas = Array.isArray(staff?.assignedAreas) ? staff.assignedAreas.map((area) => String(area || '').toLowerCase()) : [];
    const reasons = [];
    let score = 0;
    const phaseHits = signals.phases.filter((phase) => assignedPhases.includes(phase));
    if (phaseHits.length) {
      score += 4;
      reasons.push(`Phase ${phaseHits.join(', ')}`);
    }
    const areaHits = assignedAreas.filter((area) =>
      area &&
      (
        signals.text.includes(area) ||
        signals.blocks.some((block) => area.includes(`block ${block}`) || area.includes(`b${block}`) || area === block) ||
        signals.lots.some((lot) => area.includes(`lot ${lot}`) || area.includes(`l${lot}`) || area === lot)
      )
    );
    if (areaHits.length) {
      score += 3;
      reasons.push(areaHits.slice(0, 2).join(', '));
    }
    if (staff?.patrolSchedule) {
      score += 1;
      reasons.push(staff.patrolSchedule);
    }
    return {
      ...staff,
      recommendationScore: score,
      recommendationReason: reasons.length ? reasons.join(' • ') : 'Available security staff'
    };
  };

  const getRecommendedStaff = (item) => {
    const currentAssigned = item?.assignedTo && typeof item.assignedTo === 'object' ? item.assignedTo : null;
    const currentAssignedId = currentAssigned?._id;
    const baseStaff = currentAssignedId && !staffMembers.some((staff) => String(staff._id) === String(currentAssignedId))
      ? [...staffMembers, currentAssigned]
      : staffMembers;
    return baseStaff
      .map((staff) => getStaffRecommendation(staff, item))
      .sort((a, b) => b.recommendationScore - a.recommendationScore || String(a.firstName || '').localeCompare(String(b.firstName || '')));
  };

  const assignStaff = async (item, staffId) => {
    if (!staffId) return;
    setAssigningId(item._id);
    try {
      await axios.put(`/api/service-requests/${item._id}/assign-staff`, { assignedTo: staffId });
      toast.success('Security request assigned');
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign request');
    } finally {
      setAssigningId('');
    }
  };

  const canHandleRequest = (item) => {
    const assignedId = item.assignedTo?._id || item.assignedTo;
    const myId = currentUser?._id || currentUser?.id;
    const isHeadOfficer =
      currentUser?.securityLevel === 'head-officer' ||
      String(currentUser?.email || '').toLowerCase() === 'security@vims.com';
    return Boolean(
      myId &&
      assignedId &&
      (
        String(assignedId) === String(myId) ||
        (isHeadOfficer && ['security', 'complaint'].includes(item.category))
      )
    );
  };

  const getStatusActionHint = (item) => {
    const assignedId = item.assignedTo?._id || item.assignedTo;
    if (isHeadOfficer && ['security', 'complaint'].includes(item.category) && !assignedId) {
      return 'Assign security staff before changing status';
    }
    if (!canHandleRequest(item)) return 'Only assigned security staff can update status';
    if (item.status === 'completed') return 'Request already completed';
    return '';
  };

  useEffect(() => {
    setPage(0);
  }, [activeTab, priority, category, query]);

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredRows.length) {
      setPage(Math.max(0, Math.ceil(filteredRows.length / rowsPerPage) - 1));
    }
  }, [filteredRows.length, page, rowsPerPage]);

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
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
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
              mr: 1.5,
              color: themeColors.primary,
              borderRadius: 2.5,
              bgcolor: 'rgba(34, 197, 94, 0.14)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ flexGrow: 1, fontWeight: 800, color: themeColors.textPrimary }}>
            Security Services & Complaints
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
        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Security Service Requests
          </Typography>
          <Typography sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Monitor assigned security requests and resident complaints in real time.
          </Typography>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Total', value: stats.total, helper: 'all visible', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', shadow: '0 14px 34px rgba(14,165,233,0.34)' },
            { label: 'Assigned', value: stats.assigned, helper: 'for review', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: '0 14px 34px rgba(245,158,11,0.34)' },
            { label: 'In Progress', value: stats.inProgress, helper: 'active work', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', shadow: '0 14px 34px rgba(29,78,216,0.34)' },
            { label: 'Completed', value: stats.completed, helper: 'resolved', gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', shadow: '0 14px 34px rgba(22,163,74,0.34)' }
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card
                sx={{
                  borderRadius: '20px',
                  background: stat.gradient,
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: stat.shadow
                }}
              >
                <CardContent>
                  <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>{stat.label}</Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>{stat.value}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                    ↗ {stat.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 2, borderRadius: '20px', mb: 2, border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
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
            <MenuItem value="urgent">Urgent</MenuItem>
          </TextField>
          <TextField select size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">All Security Work</MenuItem>
            <MenuItem value="security">Security</MenuItem>
            <MenuItem value="complaint">Complaint</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="utilities">Utilities</MenuItem>
            <MenuItem value="sanitation">Sanitation</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: '20px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
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
              {paginatedRows.map((item) => (
                <TableRow key={item._id} hover sx={{ '&:hover': { backgroundColor: 'rgba(22, 163, 74, 0.04)' } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                  </TableCell>
                  <TableCell>{item.residentId?.firstName || ''} {item.residentId?.lastName || ''}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.priority || 'normal'} color={item.priority === 'urgent' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell><Chip size="small" label={item.status} /></TableCell>
                  <TableCell>
                    {isHeadOfficer ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={item.assignedTo?._id || item.assignedTo || ''}
                        disabled={assigningId === item._id}
                        onChange={(event) => assignStaff(item, event.target.value)}
                        sx={{ minWidth: 220 }}
                      >
                        <MenuItem value="" disabled>Assign security staff</MenuItem>
                        {getRecommendedStaff(item).map((staff) => (
                          <MenuItem key={staff._id} value={staff._id}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {staff.firstName} {staff.lastName}{staff.recommendationScore > 0 ? ' • Recommended' : ''}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {staff.recommendationReason}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      item.assignedTo ? `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}` : 'Unassigned'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {getStatusActionHint(item) && (
                      <Typography variant="caption" sx={{ display: 'block', color: themeColors.textSecondary, mb: 0.5 }}>
                        {getStatusActionHint(item)}
                      </Typography>
                    )}
                    <Button
                      size="small"
                      disabled={!canHandleRequest(item) || item.status === 'completed'}
                      onClick={() => updateStatus(item._id, 'in-progress')}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      Start
                    </Button>
                    <Button
                      size="small"
                      disabled={!canHandleRequest(item) || item.status === 'completed'}
                      onClick={() => updateStatus(item._id, 'completed')}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      Complete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredRows.length > 0 && (
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        )}

        {filteredRows.length === 0 && (
          <Paper sx={{ p: 3, borderRadius: '20px', border: `1px solid ${themeColors.border}` }}>
            <Typography color="text.secondary">No service requests match the selected filters.</Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default SecurityServiceRequests;
