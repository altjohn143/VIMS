import React from 'react';
import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const ReportToolbar = ({ onExportPdf, scheduleLink }) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {onExportPdf && (
        <Button variant="outlined" onClick={onExportPdf}>
          Export PDF
        </Button>
      )}
      {scheduleLink && (
        <Button component={RouterLink} to={scheduleLink} variant="outlined">
          Schedule Delivery
        </Button>
      )}
    </Box>
  );
};

export default ReportToolbar;
