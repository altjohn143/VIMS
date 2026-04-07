import React from 'react';
import { Container, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const AdminReports = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Typography variant="h4" sx={{ mb: 3 }}>Admin Reports Center</Typography>
    <Grid container spacing={2}>
      {[
        { title: 'Service Requests Reports', to: '/admin/service-requests' },
        { title: 'Visitor Reports', to: '/admin/visitor-management' },
        { title: 'Payments Reports', to: '/admin/payments' },
        { title: 'Scheduled Deliveries', to: '/admin/report-schedules' }
      ].map((item) => (
        <Grid item xs={12} sm={6} key={item.to}>
          <Card>
            <CardContent>
              <Typography sx={{ mb: 1 }}>{item.title}</Typography>
              <Button component={RouterLink} to={item.to} variant="outlined">Open</Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Container>
);

export default AdminReports;
