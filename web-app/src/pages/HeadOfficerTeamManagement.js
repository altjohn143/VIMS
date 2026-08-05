import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  EditLocationAlt as EditLocationAltIcon,
  People as PeopleIcon,
  ReportProblemOutlined as ReportProblemOutlinedIcon
} from '@mui/icons-material';
import axios from '../config/axios';

const themeColors = {
  primary: '#166534',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const HeadOfficerTeamManagement = ({ view = 'team' }) => {
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [routeForm, setRouteForm] = useState({ assignedPhases: '', assignedAreas: '', patrolSchedule: '' });
  const [savingRoute, setSavingRoute] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [teamRes, logsRes, analyticsRes] = await Promise.all([
        axios.get('/api/patrols/head-officer/team'),
        axios.get('/api/patrols'),
        axios.get('/api/patrols/head-officer/analytics')
      ]);
      setTeam(teamRes.data?.data || []);
      setLogs(logsRes.data?.data || []);
      setAnalytics(analyticsRes.data?.data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const issueLogs = logs.filter((log) => log.status === 'issue_found');
    const completedLogs = logs.filter((log) => ['completed', 'nothing_found'].includes(log.status));
    const today = new Date().toDateString();
    const todayLogs = logs.filter((log) => new Date(log.loggedAt || log.createdAt).toDateString() === today);

    return [
      { label: 'Personnel', value: team.length, icon: <PeopleIcon />, color: '#7c3aed' },
      { label: 'Patrol Logs', value: logs.length, icon: <AssignmentIcon />, color: '#0ea5e9' },
      { label: 'Completed', value: completedLogs.length, icon: <CheckCircleIcon />, color: '#16a34a' },
      { label: 'Issues', value: issueLogs.length, icon: <ReportProblemOutlinedIcon />, color: '#dc2626' },
      { label: 'Today', value: todayLogs.length, icon: <AnalyticsIcon />, color: '#f59e0b' }
    ];
  }, [logs, team]);

  const titleMap = {
    team: 'Personnel Management',
    performance: 'Team Performance',
    analytics: 'Patrol Analytics',
    approvals: 'Pending Approvals'
  };

  const formatList = (value, fallback = 'None') => {
    if (!Array.isArray(value) || value.length === 0) return fallback;
    return value.join(', ');
  };

  const getOfficerName = (officer) => `${officer?.firstName || ''} ${officer?.lastName || ''}`.trim() || 'Unassigned officer';
  const openRouteDialog = (member) => {
    setSelectedMember(member);
    setRouteForm({
      assignedPhases: Array.isArray(member.assignedPhases) ? member.assignedPhases.join(', ') : '',
      assignedAreas: Array.isArray(member.assignedAreas) ? member.assignedAreas.join(', ') : '',
      patrolSchedule: member.patrolSchedule || ''
    });
    setRouteDialogOpen(true);
  };
  const saveRoute = async () => {
    if (!selectedMember) return;
    setSavingRoute(true);
    try {
      await axios.put(`/api/patrols/assign/${selectedMember._id}`, {
        securityLevel: 'personnel',
        assignedPhases: routeForm.assignedPhases
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5),
        assignedAreas: routeForm.assignedAreas
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        patrolSchedule: routeForm.patrolSchedule.trim(),
        headOfficerId: selectedMember.headOfficerId?._id || selectedMember.headOfficerId || null
      });
      setRouteDialogOpen(false);
      setSelectedMember(null);
      await load();
    } finally {
      setSavingRoute(false);
    }
  };
  const issueLogs = logs.filter((log) => log.status === 'issue_found');
  const completedLogs = logs.filter((log) => ['completed', 'nothing_found'].includes(log.status));
  const recentLogs = logs.slice(0, 12);
  const activeTeam = team.filter((member) => member.isActive);
  const unassignedTeam = team.filter((member) => !member.headOfficerId);

  const renderPersonnelView = () => (
    <Paper sx={{ borderRadius: '8px', border: `1px solid ${themeColors.border}`, overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Team Members</Typography>
        <Typography sx={{ color: themeColors.textSecondary, fontSize: '0.85rem', fontWeight: 600 }}>
          Assigned personnel and unassigned admin-created personnel available for supervision.
        </Typography>
      </Box>
      <List sx={{ pt: 0 }}>
        {team.length === 0 ? (
          <ListItem>
            <ListItemText primary="No personnel available yet." />
          </ListItem>
        ) : team.map((member) => (
          <ListItem key={member._id} divider alignItems="flex-start">
            <Avatar sx={{ mr: 1.5, bgcolor: '#dcfce7', color: themeColors.primary }}>
              {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
            </Avatar>
            <ListItemText
              primary={getOfficerName(member)}
              secondary={
                <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                  <Typography component="span" sx={{ display: 'block', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                    {member.email || 'No email'} | {member.phone || 'No phone'}
                  </Typography>
                  <Typography component="span" sx={{ display: 'block', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                    Location: {formatList(member.assignedAreas, 'No assigned area')} | Phases: {formatList(member.assignedPhases, 'No phases')}
                  </Typography>
                  <Typography component="span" sx={{ display: 'block', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
                    Time: {member.patrolSchedule || 'No patrol schedule'}
                  </Typography>
                </Box>
              }
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-end' }}>
              <Chip size="small" label={member.isActive ? 'Active' : 'Inactive'} color={member.isActive ? 'success' : 'default'} />
              {!member.headOfficerId && <Chip size="small" label="Unassigned" variant="outlined" />}
              <Button
                size="small"
                variant="contained"
                startIcon={<EditLocationAltIcon />}
                onClick={() => openRouteDialog(member)}
                sx={{ bgcolor: themeColors.primary, textTransform: 'none', fontWeight: 800, borderRadius: '8px', '&:hover': { bgcolor: '#14532d' } }}
              >
                Edit Route
              </Button>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const renderPerformanceView = () => (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, borderRadius: '8px', border: `1px solid ${themeColors.border}` }}>
          <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Personnel Coverage</Typography>
          <Typography sx={{ mt: 1, color: themeColors.textSecondary }}>Active personnel: {activeTeam.length}</Typography>
          <Typography sx={{ color: themeColors.textSecondary }}>Unassigned personnel: {unassignedTeam.length}</Typography>
          <Typography sx={{ color: themeColors.textSecondary }}>Personnel with schedules: {team.filter((member) => member.patrolSchedule).length}</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ borderRadius: '8px', border: `1px solid ${themeColors.border}`, overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Recent Team Activity</Typography>
          </Box>
          <List sx={{ pt: 0 }}>
            {recentLogs.length === 0 ? (
              <ListItem><ListItemText primary="No patrol activity yet." /></ListItem>
            ) : recentLogs.map((log) => (
              <ListItem key={log._id} divider>
                <ListItemText
                  primary={`${log.area || 'Area'} - ${log.checkpoint || 'Checkpoint'}`}
                  secondary={`${getOfficerName(log.officerId)} | ${new Date(log.loggedAt || log.createdAt).toLocaleString()}`}
                />
                <Chip size="small" label={log.status || 'completed'} color={log.status === 'issue_found' ? 'warning' : 'success'} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderAnalyticsView = () => (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '8px', border: `1px solid ${themeColors.border}` }}>
          <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Patrol Outcomes</Typography>
          <Typography sx={{ mt: 1, color: themeColors.textSecondary }}>Total live logs: {analytics?.totalLogs ?? logs.length}</Typography>
          <Typography sx={{ color: themeColors.textSecondary }}>Today: {analytics?.todayLogs ?? 0}</Typography>
          <Typography sx={{ color: themeColors.textSecondary }}>Completed or clear: {analytics?.completedLogs ?? completedLogs.length}</Typography>
          <Typography sx={{ color: themeColors.textSecondary }}>Issues found: {analytics?.issueLogs ?? issueLogs.length}</Typography>
          <Typography sx={{ color: themeColors.textSecondary }}>Completion rate: {analytics?.completionRate ?? (logs.length ? Math.round((completedLogs.length / logs.length) * 100) : 0)}%</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '8px', border: `1px solid ${themeColors.border}` }}>
          <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Coverage Areas</Typography>
          {team.length === 0 ? (
            <Typography sx={{ mt: 1, color: themeColors.textSecondary }}>No assignment data yet.</Typography>
          ) : team.map((member) => (
            <Typography key={member._id} sx={{ mt: 1, color: themeColors.textSecondary }}>
              {getOfficerName(member)}: {formatList(member.assignedAreas, 'No area')} | {member.patrolSchedule || 'No schedule'}
            </Typography>
          ))}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '8px', border: `1px solid ${themeColors.border}` }}>
          <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Logs By Phase</Typography>
          {(analytics?.byPhase || []).length === 0 ? (
            <Typography sx={{ mt: 1, color: themeColors.textSecondary }}>No phase activity yet.</Typography>
          ) : analytics.byPhase.map((row) => (
            <Typography key={row.phase} sx={{ mt: 1, color: themeColors.textSecondary }}>
              {row.phase}: {row.total} logs
            </Typography>
          ))}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '8px', border: `1px solid ${themeColors.border}` }}>
          <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Personnel Activity</Typography>
          {(analytics?.byOfficer || []).length === 0 ? (
            <Typography sx={{ mt: 1, color: themeColors.textSecondary }}>No personnel activity yet.</Typography>
          ) : analytics.byOfficer.map((row) => (
            <Typography key={row.officerId} sx={{ mt: 1, color: themeColors.textSecondary }}>
              {row.name}: {row.total} logs | {row.completed} completed | {row.issues} issues
            </Typography>
          ))}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderApprovalsView = () => (
    <Paper sx={{ borderRadius: '8px', border: `1px solid ${themeColors.border}`, overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Pending Patrol Reports</Typography>
        <Typography sx={{ color: themeColors.textSecondary, fontSize: '0.85rem', fontWeight: 600 }}>
          Patrol logs marked with issues for head officer review.
        </Typography>
      </Box>
      <List sx={{ pt: 0 }}>
        {issueLogs.length === 0 ? (
          <ListItem><ListItemText primary="No pending patrol reports." /></ListItem>
        ) : issueLogs.map((log) => (
          <ListItem key={log._id} divider alignItems="flex-start">
            <ListItemText
              primary={`${log.area || 'Area'} - ${log.checkpoint || 'Checkpoint'}`}
              secondary={`${getOfficerName(log.officerId)} | ${new Date(log.loggedAt || log.createdAt).toLocaleString()} | ${log.notes || 'No notes'}`}
            />
            <Chip size="small" label="Issue Found" color="warning" />
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const renderView = () => {
    if (view === 'performance') return renderPerformanceView();
    if (view === 'analytics') return renderAnalyticsView();
    if (view === 'approvals') return renderApprovalsView();
    return renderPersonnelView();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontSize: '1.45rem', fontWeight: 900, color: themeColors.textPrimary, mb: 0.75 }}>
        {titleMap[view] || 'Team Supervision'}
      </Typography>
      <Typography sx={{ color: themeColors.textSecondary, fontWeight: 600, mb: 2.5 }}>
        Monitor assigned personnel, patrol coverage, and reports under your supervision.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={2.4} key={stat.label}>
            <Paper sx={{ p: 2, borderRadius: '8px', border: `1px solid ${themeColors.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Avatar sx={{ bgcolor: `${stat.color}20`, color: stat.color }}>{stat.icon}</Avatar>
                <Box>
                  <Typography sx={{ fontSize: '1.45rem', fontWeight: 900, color: themeColors.textPrimary }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: themeColors.textSecondary, fontWeight: 700 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {renderView()}

      <Dialog open={routeDialogOpen} onClose={() => setRouteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Patrol Route</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <Typography sx={{ color: themeColors.textSecondary, fontWeight: 700 }}>
            {selectedMember ? getOfficerName(selectedMember) : 'Security personnel'}
          </Typography>
          <TextField
            label="Phases"
            value={routeForm.assignedPhases}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, assignedPhases: event.target.value }))}
            helperText="Comma-separated phase numbers, for example: 1, 2, 3"
          />
          <TextField
            label="Assigned Areas"
            value={routeForm.assignedAreas}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, assignedAreas: event.target.value }))}
            helperText="Comma-separated patrol areas"
          />
          <TextField
            label="Patrol Schedule"
            value={routeForm.patrolSchedule}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, patrolSchedule: event.target.value }))}
            placeholder="e.g. Mon-Fri 8:00 PM - 12:00 AM"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRouteDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Cancel</Button>
          <Button variant="contained" startIcon={<EditLocationAltIcon />} onClick={saveRoute} disabled={savingRoute} sx={{ bgcolor: themeColors.primary, textTransform: 'none', fontWeight: 800, borderRadius: '8px', '&:hover': { bgcolor: '#14532d' } }}>
            {savingRoute ? 'Saving...' : 'Save Route'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HeadOfficerTeamManagement;
