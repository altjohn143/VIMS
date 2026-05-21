import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [teamRes, logsRes] = await Promise.all([
        axios.get('/api/patrols/head-officer/team'),
        axios.get('/api/patrols')
      ]);
      setTeam(teamRes.data?.data || []);
      setLogs(logsRes.data?.data || []);
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
            <Paper sx={{ p: 2, borderRadius: '18px', border: `1px solid ${themeColors.border}` }}>
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

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ borderRadius: '18px', border: `1px solid ${themeColors.border}`, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Team Members</Typography>
            </Box>
            <List sx={{ pt: 0 }}>
              {team.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No personnel assigned yet." />
                </ListItem>
              ) : team.map((member) => (
                <ListItem key={member._id} divider>
                  <Avatar sx={{ mr: 1.5, bgcolor: '#dcfce7', color: themeColors.primary }}>
                    {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                  </Avatar>
                  <ListItemText
                    primary={`${member.firstName || ''} ${member.lastName || ''}`.trim()}
                    secondary={`${member.email || 'No email'} | ${member.patrolSchedule || 'No schedule'}`}
                  />
                  <Chip size="small" label={member.isActive ? 'Active' : 'Inactive'} color={member.isActive ? 'success' : 'default'} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: '18px', border: `1px solid ${themeColors.border}`, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900, color: themeColors.textPrimary }}>Recent Patrol Activity</Typography>
            </Box>
            <List sx={{ pt: 0 }}>
              {logs.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No patrol activity yet." />
                </ListItem>
              ) : logs.slice(0, 12).map((log) => (
                <ListItem key={log._id} divider>
                  <ListItemText
                    primary={`${log.area || 'Area'} - ${log.checkpoint || 'Checkpoint'}`}
                    secondary={`${log.officerId?.firstName || ''} ${log.officerId?.lastName || ''} | ${new Date(log.loggedAt || log.createdAt).toLocaleString()}`}
                  />
                  <Chip size="small" label={log.status || 'completed'} color={log.status === 'issue_found' ? 'warning' : 'success'} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HeadOfficerTeamManagement;
