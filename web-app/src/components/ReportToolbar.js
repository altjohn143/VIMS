import React from 'react';
import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const ReportToolbar = ({ onExportXlsx, onExportPdf, scheduleLink = '/admin/report-schedules' }) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {onExportXlsx && (
        <Button variant="outlined" onClick={onExportXlsx}>
          Export XLSX
        </Button>
      )}
      {onExportPdf && (
        <Button variant="outlined" onClick={onExportPdf}>
          Export PDF
        </Button>
      )}
      <Button component={RouterLink} to={scheduleLink} variant="outlined">
        Schedule Delivery
      </Button>
    </Box>
  );
};

export default ReportToolbar;
